// ダッシュボードが使う売上明細を、データベースから読み出す。
//
// 集計そのものは lib/kpi/ の純粋関数が行う。ここは「読んで SalesRow の形に整える」だけ。
// RLS（行ごとのアクセス制限）により、ログイン中の人が取り込んだ行だけが返る。
//
// 【どの行を集計するか】いちばん新しい取り込み 1 件分だけを見る。
// 取り込みは毎回「追加」で行われる（app/import/actions.ts）ため、同じスプレッドシートを
// 2 回取り込むと明細が 2 セット残る。全件を足すと売上が二重に数えられてしまう。
// クライアントの運用は「1 枚のシートに全期間の売上を貯め、毎月取り込み直す」なので、
// 最新の 1 件＝その時点の全期間データになる。過去の取り込みは履歴として残す（/import の一覧）。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SalesRow } from "@/lib/sales-row";

/**
 * 1 回の問い合わせで読む行数。
 *
 * Supabase は 1 回の応答で返す行数に上限があり（既定 1,000 行）、超えた分は黙って切られる。
 * 切られたまま集計すると売上が過少になるので、この単位で最後まで繰り返し読む。
 */
const PAGE_SIZE = 1000;

/**
 * 1 回の取り込みで集計できる行数の上限。
 *
 * これを超えると往復回数が増えすぎて、画面表示が Vercel の制限時間に間に合わなくなる。
 * 中途半端な行数で集計して誤った売上を出すより、はっきり「読めなかった」と伝える。
 */
const MAX_ROWS = 50_000;

const SELECT_COLUMNS = "order_date, customer_id, product_name, category, sku, quantity, revenue, cost";

export type LoadSalesRowsResult =
  | {
      ok: true;
      rows: SalesRow[];
      /** 集計に使った取り込みの日時（ISO 文字列）。1 件も取り込んでいなければ null */
      uploadedAt: string | null;
    }
  | { ok: false };

/**
 * Supabase の numeric 列は、経路によって文字列（"24800.00"）で返ることがある。
 * 合計する前に必ず数値へ直す。数値にできない値は 0 として扱い、集計を止めない。
 */
function toNumber(value: number | string | null): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 行 1 件を、取り込み側と同じ SalesRow の形に直す */
function toSalesRow(row: {
  order_date: string;
  customer_id: string | null;
  product_name: string;
  category: string | null;
  sku: string | null;
  quantity: number | string;
  revenue: number | string;
  cost: number | string;
}): SalesRow {
  return {
    order_date: row.order_date,
    customer_id: row.customer_id,
    product_name: row.product_name,
    category: row.category,
    sku: row.sku,
    quantity: toNumber(row.quantity),
    revenue: toNumber(row.revenue),
    cost: toNumber(row.cost),
  };
}

type LatestUpload = { id: string; uploaded_at: string };

/** いちばん新しい取り込みを 1 件返す。まだ 1 件も無ければ null、読めなければ "error" */
async function findLatestUpload(
  supabase: SupabaseClient<Database>,
): Promise<LatestUpload | null | "error"> {
  const { data, error } = await supabase
    .from("uploads")
    .select("id, uploaded_at")
    .order("uploaded_at", { ascending: false })
    // 同じ時刻の取り込みが 2 件あっても、毎回同じ 1 件を選ぶようにする
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("取り込み履歴の読み込みに失敗しました", error);
    return "error";
  }
  return data;
}

/** いちばん新しい取り込みの売上明細をすべて読む。失敗したら ok: false（「0 件」と区別するため） */
export async function loadSalesRows(
  supabase: SupabaseClient<Database>,
): Promise<LoadSalesRowsResult> {
  const latestUpload = await findLatestUpload(supabase);
  if (latestUpload === "error") return { ok: false };
  if (!latestUpload) return { ok: true, rows: [], uploadedAt: null };

  const rows: SalesRow[] = [];
  /** 明細の総数。1 ページ目の応答で分かる */
  let total: number | null = null;

  while (total === null || rows.length < total) {
    const { data, error, count } = await supabase
      .from("sales_data")
      // count: "exact" で「全部で何行あるか」も一緒に受け取る。
      // 「1,000 行未満なら最後のページ」と決め打ちにすると、Supabase 側の 1 回あたりの
      // 上限設定が変わったときに、途中までの行で黙って集計を終えてしまう
      .select(SELECT_COLUMNS, { count: "exact" })
      .eq("upload_id", latestUpload.id)
      // 並び順を固定しないと、ページの境目で同じ行を 2 回読んだり読み飛ばしたりする
      .order("order_date", { ascending: true })
      .order("id", { ascending: true })
      .range(rows.length, rows.length + PAGE_SIZE - 1);

    if (error) {
      console.error("売上データの読み込みに失敗しました", error);
      return { ok: false };
    }

    if (total === null) {
      total = count ?? data.length;
      if (total > MAX_ROWS) {
        console.error(`売上データが上限 ${MAX_ROWS} 行を超えました（${total} 行）`);
        return { ok: false };
      }
    }

    // 1 行も返らないのに総数に届いていない = これ以上進めない（無限に読み続けない）
    if (data.length === 0) {
      console.error(`売上データを最後まで読めませんでした（${rows.length} / ${total} 行）`);
      return { ok: false };
    }

    for (const row of data) rows.push(toSalesRow(row));
  }

  return { ok: true, rows, uploadedAt: latestUpload.uploaded_at };
}
