// 画面に出る「文字列」が docs/sample-data.md の正解値と一致することを確かめる。
//
// lib/kpi/ のテスト（tests/kpi/）は数値の正しさを見ている。ここでは、その数値を
// 画面用に整形したあとの見た目まで崩れていないことを見る（￥や % の付け方、丸めの位置）。
//
// グラフ（Recharts）は jsdom では描画領域の大きさが 0 になり中身が出ないため、
// ユニットテストの対象にしていない。グラフの見た目はブラウザでの目視で確認する。

import { formatMonthLabel, formatMom, formatPercent, formatYen } from "@/lib/dashboard/format";
import { selectMonth } from "@/lib/dashboard/select-month";
import { calcCategoryBreakdown, calcTopSkus, calcOverallRepeatRate } from "@/lib/kpi/breakdown";
import { calcMonthlyKpis } from "@/lib/kpi/monthly";
import { loadSampleRows } from "../helpers/sample-rows";

const rows = loadSampleRows();
const monthlyKpis = calcMonthlyKpis(rows);
const months = monthlyKpis.map((kpi) => kpi.month);

function kpiOf(month: string) {
  const kpi = monthlyKpis.find((item) => item.month === month);
  if (!kpi) throw new Error(`${month} の集計がありません`);
  return kpi;
}

describe("既定で開く月", () => {
  it("最新月（2025-11）が選ばれ、見出しは 2025年11月 になる", () => {
    const selected = selectMonth(months, undefined);
    expect(selected).toBe("2025-11");
    expect(formatMonthLabel("2025-11")).toBe("2025年11月");
  });
});

describe("KPI カードの表示（2025-11）", () => {
  const kpi = kpiOf("2025-11");

  it("売上は ￥264,700、前月比は +79.5%", () => {
    expect(formatYen(kpi.revenue)).toBe("￥264,700");
    expect(formatMom(kpi.revenueMoM)).toEqual({ text: "+79.5%", direction: "up" });
  });

  it("粗利は ￥163,100、粗利率は 61.6%", () => {
    expect(formatYen(kpi.grossProfit)).toBe("￥163,100");
    expect(formatPercent(kpi.grossMarginRate)).toBe("61.6%");
  });

  it("リピート率は 46.7%（15 人中 7 人）", () => {
    expect(formatPercent(kpi.repeatRate)).toBe("46.7%");
    expect(kpi.buyerCount).toBe(15);
    expect(kpi.repeatBuyerCount).toBe(7);
  });
});

describe("KPI カードの表示（2025-09、最初の月）", () => {
  const kpi = kpiOf("2025-09");

  it("売上は ￥148,400 で、前月が無いので前月比は —", () => {
    expect(formatYen(kpi.revenue)).toBe("￥148,400");
    expect(formatMom(kpi.revenueMoM)).toEqual({ text: "—", direction: "none" });
  });

  it("最初の月のリピート率は 0.0%（— ではない）", () => {
    expect(formatPercent(kpi.repeatRate)).toBe("0.0%");
  });
});

describe("2025-10 の前月比", () => {
  it("わずかな減少は -0.6% と赤で出す", () => {
    expect(formatMom(kpiOf("2025-10").revenueMoM)).toEqual({ text: "-0.6%", direction: "down" });
  });
});

describe("カテゴリ別・SKU・全期間リピート率（2025-11）", () => {
  it("カテゴリは売上の降順で、アウターが ￥198,200（74.9%）", () => {
    const categories = calcCategoryBreakdown(rows, { month: "2025-11" });
    expect(categories.map((item) => item.category)).toEqual([
      "アウター",
      "トップス",
      "ボトムス",
      "アクセサリー",
    ]);
    expect(formatYen(categories[0].revenue)).toBe("￥198,200");
    expect(formatPercent(categories[0].share)).toBe("74.9%");
  });

  it("SKU 1 位はウールコート ￥99,200（4 点）", () => {
    const top = calcTopSkus(rows, { month: "2025-11", limit: 10 });
    expect(top[0].sku).toBe("LUM-OUT-01");
    expect(top[0].productName).toBe("ウールコート");
    expect(formatYen(top[0].revenue)).toBe("￥99,200");
    expect(top[0].quantity).toBe(4);
    expect(top.length).toBeLessThanOrEqual(10);
  });

  it("全期間のリピート率は 28.6%（28 人中 8 人）", () => {
    const overall = calcOverallRepeatRate(rows);
    expect(formatPercent(overall.rate)).toBe("28.6%");
    expect(overall.totalCustomers).toBe(28);
    expect(overall.repeatCustomers).toBe(8);
  });
});
