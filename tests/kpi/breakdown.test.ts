import {
  calcCategoryBreakdown,
  calcOverallRepeatRate,
  calcTopSkus,
  UNCATEGORIZED,
} from "@/lib/kpi/breakdown";
import { loadSampleRows, makeRow } from "../helpers/sample-rows";

const rows = loadSampleRows();

describe("カテゴリ別売上（docs/sample-data.md の正解値と完全一致すること）", () => {
  it("全期間の売上が、売上の多い順に一致する", () => {
    expect(calcCategoryBreakdown(rows).map((c) => [c.category, c.revenue])).toEqual([
      ["アウター", 287400],
      ["トップス", 114400],
      ["ボトムス", 82200],
      ["アクセサリー", 76600],
    ]);
  });

  it("2025-11 の構成比が一致する", () => {
    expect(calcCategoryBreakdown(rows, { month: "2025-11" })).toEqual([
      { category: "アウター", revenue: 198200, share: 74.9 },
      { category: "トップス", revenue: 35600, share: 13.4 },
      { category: "ボトムス", revenue: 16100, share: 6.1 },
      { category: "アクセサリー", revenue: 14800, share: 5.6 },
    ]);
  });

  it("カテゴリが空の行は「未分類」にまとめ、売上から落とさない", () => {
    const result = calcCategoryBreakdown([
      makeRow({ category: null, revenue: 300 }),
      makeRow({ category: "  ", revenue: 200 }),
      makeRow({ category: "アウター", revenue: 500 }),
    ]);

    expect(result).toEqual([
      { category: "アウター", revenue: 500, share: 50 },
      { category: UNCATEGORIZED, revenue: 500, share: 50 },
    ]);
  });

  it("売上が全部 0 なら、構成比は null（0% と区別する）", () => {
    const result = calcCategoryBreakdown([makeRow({ category: "アウター", revenue: 0 })]);
    expect(result[0].share).toBeNull();
  });

  it("構成比は丸める前の値から計算する（合計が 100% からずれない）", () => {
    const result = calcCategoryBreakdown([
      makeRow({ category: "A", revenue: 0.334 }),
      makeRow({ category: "B", revenue: 0.333 }),
      makeRow({ category: "C", revenue: 0.333 }),
    ]);
    expect(result.map((c) => c.share)).toEqual([33.4, 33.3, 33.3]);
  });

  it("売上が同じなら名前順にして、実行のたびに順番が変わらないようにする", () => {
    const result = calcCategoryBreakdown([
      makeRow({ category: "ボトムス", revenue: 100 }),
      makeRow({ category: "アウター", revenue: 100 }),
    ]);

    expect(result.map((c) => c.category)).toEqual(["アウター", "ボトムス"]);
  });
});

describe("SKU ランキング（docs/sample-data.md の正解値と完全一致すること）", () => {
  it("2025-11 の上位 2 件が一致する", () => {
    expect(calcTopSkus(rows, { month: "2025-11" }).slice(0, 2)).toEqual([
      { sku: "LUM-OUT-01", productName: "ウールコート", revenue: 99200, quantity: 4 },
      { sku: "LUM-OUT-02", productName: "ダウンジャケット", revenue: 99000, quantity: 5 },
    ]);
  });

  it("既定では 10 件までに絞る", () => {
    expect(calcTopSkus(rows).length).toBeLessThanOrEqual(10);
  });

  it("件数は指定できる", () => {
    expect(calcTopSkus(rows, { limit: 3 })).toHaveLength(3);
  });

  it("件数に 0 や負の数を渡しても、余計な行を返さない", () => {
    expect(calcTopSkus(rows, { limit: 0 })).toEqual([]);
    expect(calcTopSkus(rows, { limit: -1 })).toEqual([]);
  });

  it("SKU の売上が同じなら SKU 名順にして、順番が変わらないようにする", () => {
    const result = calcTopSkus([
      makeRow({ sku: "LUM-TOP-02", revenue: 100 }),
      makeRow({ sku: "LUM-OUT-01", revenue: 100 }),
    ]);
    expect(result.map((s) => s.sku)).toEqual(["LUM-OUT-01", "LUM-TOP-02"]);
  });

  it("同じ SKU に表記ゆれがあっても、商品名は入力順に左右されない", () => {
    const forward = calcTopSkus([
      makeRow({ sku: "LUM-OUT-01", product_name: "ウールコート" }),
      makeRow({ sku: "LUM-OUT-01", product_name: "ウール コート" }),
    ]);
    const backward = calcTopSkus([
      makeRow({ sku: "LUM-OUT-01", product_name: "ウール コート" }),
      makeRow({ sku: "LUM-OUT-01", product_name: "ウールコート" }),
    ]);
    expect(forward[0].productName).toBe(backward[0].productName);
  });

  it("SKU が空の行は順位を付けられないので除外する", () => {
    const result = calcTopSkus([
      makeRow({ sku: null, revenue: 9999 }),
      makeRow({ sku: "LUM-TOP-01", revenue: 100 }),
    ]);

    expect(result.map((s) => s.sku)).toEqual(["LUM-TOP-01"]);
  });

  it("同じ SKU は売上と数量を合算する", () => {
    const result = calcTopSkus([
      makeRow({ sku: "LUM-OUT-01", revenue: 100, quantity: 1 }),
      makeRow({ sku: "LUM-OUT-01", revenue: 200, quantity: 2 }),
    ]);

    expect(result).toEqual([
      { sku: "LUM-OUT-01", productName: "ウールコート", revenue: 300, quantity: 3 },
    ]);
  });
});

describe("全期間のリピート率（docs/sample-data.md の正解値と完全一致すること）", () => {
  it("28 人中 8 人で 28.6%", () => {
    expect(calcOverallRepeatRate(rows)).toEqual({
      totalCustomers: 28,
      repeatCustomers: 8,
      rate: 28.6,
    });
  });

  it("同じ月に何度買ってもリピーターにはならない", () => {
    const result = calcOverallRepeatRate([
      makeRow({ order_date: "2025-11-01", customer_id: "C001" }),
      makeRow({ order_date: "2025-11-20", customer_id: "C001" }),
    ]);

    expect(result).toEqual({ totalCustomers: 1, repeatCustomers: 0, rate: 0 });
  });

  it("顧客が 1 人もいなければ null（0% と区別する）", () => {
    expect(calcOverallRepeatRate([makeRow({ customer_id: null })]).rate).toBeNull();
  });
});
