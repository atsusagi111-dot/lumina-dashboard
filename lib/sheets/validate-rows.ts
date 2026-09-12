// スプレッドシートから読んだ表を検査して、保存できる形に整える。
//
// 元データは人が手で編集するので、日付の書式違いや「¥19,800」のような表記が必ず混ざる。
// そのまま保存すると KPI が静かに狂うため、保存前にここで止める。
//
// 方針：1 件目で止めず、全行を調べてからエラーをまとめて返す（直す回数を減らすため）。

import { z } from "zod";

/** スプレッドシートに必要な列。この順番・この名前で 1 行目に並んでいること */
export const EXPECTED_HEADERS = [
  "order_date",
  "customer_id",
  "product_name",
  "category",
  "sku",
  "quantity",
  "revenue",
  "cost",
] as const;

export type SalesRow = {
  order_date: string;
  customer_id: string | null;
  product_name: string;
  category: string | null;
  sku: string | null;
  quantity: number;
  revenue: number;
  cost: number;
};

/** DB の numeric(14,2) に収まる上限（supabase/migrations/0001_init.sql と対応） */
const MAX_AMOUNT = 999_999_999_999;

export type ValidationResult =
  | { ok: true; rows: SalesRow[]; skippedEmptyRows: number }
  | { ok: false; errors: string[] };

/**
 * 「¥19,800」「1,000 円」などの表記から数値だけを取り出す。
 *
 * Number() だけに任せないのは、`1e3` を 1000、`0x10` を 16 と読んでしまうため。
 * 打ち間違いが「エラー」ではなく「別の数字」になると、集計が静かにずれる。
 */
function toNumber(value: string): number | null {
  const cleaned = value.replace(/[¥￥,，\s円]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** 「2025/11/03」「2025-11-3」などを「2025-11-03」に統一する */
function toIsoDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;

  const [, year, month, day] = m;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  // 2025-02-31 のような「形式は合っているが存在しない日付」を弾く
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    return null;
  }
  return iso;
}

/**
 * 数値の列を検査する。3 列（quantity / revenue / cost）で同じ形を使う。
 *
 * 上限と小数桁を見るのは、DB の numeric(14,2) で弾かれる前に止めるため。
 * DB まで届くと「何行目が原因か」を伝えられなくなる。
 */
function numberField(column: string, rule: { integer?: boolean; min: number }) {
  return z.string().transform((value, ctx) => {
    const fail = (reason: string) => {
      ctx.addIssue({ code: "custom", message: `${column}「${value}」${reason}` });
      return z.NEVER;
    };

    const n = toNumber(value);
    if (n === null) return fail(rule.integer ? "は整数ではありません" : "は数値ではありません");
    if (rule.integer && !Number.isInteger(n)) return fail("は整数ではありません");
    if (n < rule.min) {
      return fail(rule.min === 0 ? "はマイナスにできません" : `は ${rule.min} 以上にしてください`);
    }
    if (n > MAX_AMOUNT) return fail("は大きすぎます");
    if (Math.round(n * 100) !== n * 100) return fail("の小数は 2 桁までにしてください");
    return n;
  });
}

const rowSchema = z.object({
  order_date: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v !== "", { error: "order_date が空です" })
    .transform((v, ctx) => {
      const iso = toIsoDate(v);
      if (!iso) {
        ctx.addIssue({ code: "custom", message: `order_date「${v}」は日付として読めません（例：2025-11-03）` });
        return z.NEVER;
      }
      return iso;
    }),
  customer_id: z.string().transform((v) => v.trim() || null),
  product_name: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v !== "", { error: "product_name が空です" }),
  category: z.string().transform((v) => v.trim() || null),
  sku: z.string().transform((v) => v.trim() || null),
  quantity: numberField("quantity", { integer: true, min: 1 }),
  revenue: numberField("revenue", { min: 0 }),
  cost: numberField("cost", { min: 0 }),
});

/** ヘッダー行が仕様どおりかを調べる */
function checkHeaders(header: string[]): string[] {
  const errors: string[] = [];
  const actual = header.map((h) => h.trim());

  EXPECTED_HEADERS.forEach((expected, index) => {
    const found = actual[index] ?? "";
    if (found !== expected) {
      errors.push(
        found === ""
          ? `1 行目 ${index + 1} 列目の列名がありません：期待「${expected}」`
          : `1 行目 ${index + 1} 列目の列名が違います：期待「${expected}」、実際「${found}」`,
      );
    }
  });

  return errors;
}

/**
 * スプレッドシートの値（1 行目がヘッダー）を検査する。
 * 行番号はスプレッドシート上の番号（1 始まり）で返すので、利用者がそのまま直せる。
 */
export function validateSheetValues(values: string[][]): ValidationResult {
  if (values.length === 0) {
    return { ok: false, errors: ["シートが空です。1 行目に列名、2 行目以降にデータを入れてください。"] };
  }

  const headerErrors = checkHeaders(values[0]);
  if (headerErrors.length > 0) {
    return { ok: false, errors: headerErrors };
  }

  const rows: SalesRow[] = [];
  const errors: string[] = [];
  let skippedEmptyRows = 0;

  values.slice(1).forEach((raw, index) => {
    const sheetRowNumber = index + 2; // 1 行目はヘッダーなので +2
    const cells = EXPECTED_HEADERS.map((_, i) => (raw[i] ?? "").toString());

    if (cells.every((c) => c.trim() === "")) {
      skippedEmptyRows += 1;
      return;
    }

    const parsed = rowSchema.safeParse(Object.fromEntries(EXPECTED_HEADERS.map((h, i) => [h, cells[i]])));

    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      for (const issue of parsed.error.issues) {
        errors.push(`${sheetRowNumber} 行目の ${issue.message}`);
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (rows.length === 0) {
    return { ok: false, errors: ["データ行がありません。2 行目以降に売上データを入れてください。"] };
  }

  return { ok: true, rows, skippedEmptyRows };
}
