// 売上明細の読み出し（lib/dashboard/load-sales-rows.ts）のテスト。
//
// 本物の Supabase にはつながず、同じ呼び出し方（from().select().order().range()）ができる
// 偽のクライアントを渡して確かめる。ここはページの境目・エラー・数値変換と、
// 間違いが数字の狂いに直結する場所なので、境界を厚めに見る。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadSalesRows } from "@/lib/dashboard/load-sales-rows";

type FakeSalesRow = Record<string, unknown>;

type FakeOptions = {
  /** uploads テーブルが返す最新の取り込み。null なら「まだ 1 件も取り込んでいない」 */
  latestUpload?: { id: string; uploaded_at: string } | null;
  uploadError?: boolean;
  salesRows?: FakeSalesRow[];
  salesError?: boolean;
  /** 総件数として返す値。既定は salesRows の長さ */
  reportedCount?: number;
  /** Supabase が 1 回の応答で返す最大行数。既定は無制限（要求された範囲をそのまま返す） */
  maxPerRequest?: number;
};

/** range(from, to) で呼ばれた範囲を記録しながら、指定の行を返す偽クライアント */
function createFakeSupabase(options: FakeOptions) {
  const ranges: Array<[number, number]> = [];
  const rows = options.salesRows ?? [];

  const client = {
    from(table: string) {
      if (table === "uploads") {
        const result = {
          data: options.uploadError ? null : (options.latestUpload ?? null),
          error: options.uploadError ? { message: "読めません" } : null,
        };
        const chain = {
          select: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => result,
        };
        return chain;
      }

      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async (from: number, to: number) => {
          ranges.push([from, to]);
          if (options.salesError) return { data: null, error: { message: "読めません" }, count: null };
          const last = options.maxPerRequest ? Math.min(to, from + options.maxPerRequest - 1) : to;
          return {
            data: rows.slice(from, last + 1),
            error: null,
            count: options.reportedCount ?? rows.length,
          };
        },
      };
      return chain;
    },
  };

  return { supabase: client as unknown as SupabaseClient<Database>, ranges };
}

function makeDbRow(index: number): FakeSalesRow {
  return {
    order_date: "2025-11-03",
    customer_id: `C${index}`,
    product_name: "ウールコート",
    category: "アウター",
    sku: "LUM-OUT-01",
    quantity: 1,
    revenue: 24800,
    cost: 9200,
  };
}

describe("売上明細の読み出し", () => {
  it("まだ 1 件も取り込んでいなければ、空の結果を返す（エラーではない）", async () => {
    const { supabase } = createFakeSupabase({ latestUpload: null });

    await expect(loadSalesRows(supabase)).resolves.toEqual({ ok: true, rows: [], uploadedAt: null });
  });

  it("取り込み履歴の読み込みに失敗したら ok: false を返す（0 件と区別する）", async () => {
    const { supabase } = createFakeSupabase({ uploadError: true });

    await expect(loadSalesRows(supabase)).resolves.toEqual({ ok: false });
  });

  it("売上明細の読み込みに失敗したら ok: false を返す", async () => {
    const { supabase } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesError: true,
    });

    await expect(loadSalesRows(supabase)).resolves.toEqual({ ok: false });
  });

  it("1,000 行ちょうどでも、余分な問い合わせをせずに全件返す", async () => {
    const rows = Array.from({ length: 1000 }, (_unused, index) => makeDbRow(index));
    const { supabase, ranges } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: rows,
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.rows.length).toBe(1000);
    expect(ranges).toEqual([[0, 999]]);
  });

  it("1,000 行を超えるときは続きを読み、全件そろえる", async () => {
    const rows = Array.from({ length: 1500 }, (_unused, index) => makeDbRow(index));
    const { supabase, ranges } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: rows,
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.rows.length).toBe(1500);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("1 回に返る行数が 1,000 より少ない設定でも、総件数まで読み切る", async () => {
    // Supabase 側の「1 回に返す上限」が 500 行に設定されている場合を模した状況。
    // 「1,000 行未満なら最後のページ」と決め打ちにしていると、ここで 500 行だけの集計になる
    const rows = Array.from({ length: 1200 }, (_unused, index) => makeDbRow(index));
    const { supabase, ranges } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: rows,
      maxPerRequest: 500,
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.rows.length).toBe(1200);
    expect(ranges.length).toBe(3);
  });

  it("上限 50,000 行を超えるデータは、途中まで集計せずに ok: false を返す", async () => {
    const { supabase } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: [makeDbRow(0)],
      reportedCount: 50_001,
    });

    await expect(loadSalesRows(supabase)).resolves.toEqual({ ok: false });
  });

  it("numeric 列が文字列で返っても数値に直す", async () => {
    const { supabase } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: [{ ...makeDbRow(0), quantity: "2", revenue: "24800.00", cost: "9200.50" }],
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.rows[0]).toMatchObject({ quantity: 2, revenue: 24800, cost: 9200.5 });
  });

  it("数値にできない値は 0 として扱い、集計を止めない", async () => {
    const { supabase } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: [{ ...makeDbRow(0), revenue: null, cost: "———" }],
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.rows[0]).toMatchObject({ revenue: 0, cost: 0 });
  });

  it("集計に使った取り込みの日時を返す（画面に「最終取り込み」として出す）", async () => {
    const { supabase } = createFakeSupabase({
      latestUpload: { id: "u1", uploaded_at: "2025-12-01T00:00:00Z" },
      salesRows: [makeDbRow(0)],
    });

    const result = await loadSalesRows(supabase);

    expect(result.ok && result.uploadedAt).toBe("2025-12-01T00:00:00Z");
  });
});
