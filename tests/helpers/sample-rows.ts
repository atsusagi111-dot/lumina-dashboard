import type { SalesRow } from "@/lib/sales-row";
import { validateSheetValues } from "@/lib/sheets/validate-rows";
import { loadSampleSheetValues } from "./load-fixture";

/**
 * サンプル CSV を、取り込みと同じ検査に通してから返す。
 *
 * テスト用に別の読み方をすると「取り込みでは通らない形」を検証してしまうので、
 * 本番と同じ経路（検査 → SalesRow）を通す。
 */
export function loadSampleRows(): SalesRow[] {
  const result = validateSheetValues(loadSampleSheetValues());
  if (!result.ok) throw new Error(`サンプルデータが検査を通りません: ${result.errors.join(" / ")}`);
  return result.rows;
}

/** テストで使う 1 行を、必要な部分だけ差し替えて作る */
export function makeRow(overrides: Partial<SalesRow> = {}): SalesRow {
  return {
    order_date: "2025-11-03",
    customer_id: "C001",
    product_name: "ウールコート",
    category: "アウター",
    sku: "LUM-OUT-01",
    quantity: 1,
    revenue: 24800,
    cost: 9200,
    ...overrides,
  };
}
