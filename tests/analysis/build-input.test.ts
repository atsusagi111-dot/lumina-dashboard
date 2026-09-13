// OpenAI に渡すデータの組み立てのテスト。
//
// いちばん大事なのは「売上明細と customer_id が混ざっていないこと」。
// ここが漏れると、個人につながりうる情報を外部サービスに送ってしまう（CLAUDE.md §6）。

import { buildAnalysisInput, MONTHS_IN_INPUT } from "@/lib/analysis/build-input";
import { calcCategoryBreakdown, calcTopSkus } from "@/lib/kpi/breakdown";
import { calcMonthlyKpis } from "@/lib/kpi/monthly";
import { loadSampleRows } from "../helpers/sample-rows";

const rows = loadSampleRows();
const monthlyKpis = calcMonthlyKpis(rows);

function buildFor(targetMonth: string) {
  return buildAnalysisInput({
    targetMonth,
    monthlyKpis,
    categories: calcCategoryBreakdown(rows, { month: targetMonth }),
    topSkus: calcTopSkus(rows, { month: targetMonth, limit: 10 }),
  });
}

describe("OpenAI に渡すデータ", () => {
  it("顧客 ID も売上明細も含まない", () => {
    const text = JSON.stringify(buildFor("2025-11"));

    // サンプルデータの顧客 ID（C001 など）と、明細にしかない列名が現れないこと
    expect(text).not.toMatch(/C0\d\d/);
    expect(text).not.toContain("customer");
    expect(text).not.toContain("order_date");
    expect(text).not.toContain("cost");
  });

  it("対象月を含む直近 3 か月だけを渡す（料金を抑えるため）", () => {
    const input = buildFor("2025-11");

    expect(input.monthly.map((item) => item.month)).toEqual(["2025-09", "2025-10", "2025-11"]);
    expect(input.monthly.length).toBeLessThanOrEqual(MONTHS_IN_INPUT);
  });

  it("対象月より後の月は渡さない（まだ起きていない話のため）", () => {
    const input = buildFor("2025-10");

    expect(input.monthly.map((item) => item.month)).toEqual(["2025-09", "2025-10"]);
  });

  it("docs/sample-data.md の正解値をそのまま渡す", () => {
    const input = buildFor("2025-11");

    expect(input.targetMonth).toBe("2025-11");
    expect(input.monthly.at(-1)).toEqual({
      month: "2025-11",
      revenue: 264700,
      grossProfit: 163100,
      repeatRate: 46.7,
    });
    expect(input.momChange).toEqual({ revenue: 79.5, grossProfit: 76.1 });
    expect(input.byCategory[0]).toEqual({ category: "アウター", revenue: 198200, share: 74.9 });
    expect(input.topSkus[0]).toEqual({
      sku: "LUM-OUT-01",
      productName: "ウールコート",
      revenue: 99200,
      quantity: 4,
    });
  });

  it("最初の月は前月比が渡らない（null のまま）", () => {
    expect(buildFor("2025-09").momChange).toEqual({ revenue: null, grossProfit: null });
  });

  it("集計に無い月を指定されたら、黙って別の月を渡さずエラーにする", () => {
    expect(() => buildFor("2024-01")).toThrow("2024-01");
  });
});
