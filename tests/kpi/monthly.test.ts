import { calcMonthlyKpis, previousMonthKey } from "@/lib/kpi/monthly";
import { loadSampleRows, makeRow } from "../helpers/sample-rows";

describe("月次 KPI（docs/sample-data.md の正解値と完全一致すること）", () => {
  const kpis = calcMonthlyKpis(loadSampleRows());

  it("3 か月分を古い順に返す", () => {
    expect(kpis.map((k) => k.month)).toEqual(["2025-09", "2025-10", "2025-11"]);
  });

  it("売上が一致する", () => {
    expect(kpis.map((k) => k.revenue)).toEqual([148400, 147500, 264700]);
  });

  it("粗利が一致する", () => {
    expect(kpis.map((k) => k.grossProfit)).toEqual([93400, 92600, 163100]);
  });

  it("粗利率が一致する", () => {
    expect(kpis.map((k) => k.grossMarginRate)).toEqual([62.9, 62.8, 61.6]);
  });

  it("売上の前月比が一致する（最初の月は前月が無いので null）", () => {
    expect(kpis.map((k) => k.revenueMoM)).toEqual([null, -0.6, 79.5]);
  });

  it("粗利の前月比も返す", () => {
    expect(kpis.map((k) => k.grossProfitMoM)).toEqual([null, -0.9, 76.1]);
  });

  it("月次リピート率が一致する", () => {
    expect(kpis.map((k) => k.buyerCount)).toEqual([12, 13, 15]);
    expect(kpis.map((k) => k.repeatBuyerCount)).toEqual([0, 5, 7]);
    expect(kpis.map((k) => k.repeatRate)).toEqual([0, 38.5, 46.7]);
  });
});

describe("前月の求め方", () => {
  it("年をまたぐ場合も正しく求める", () => {
    expect(previousMonthKey("2025-01")).toBe("2024-12");
    expect(previousMonthKey("2025-11")).toBe("2025-10");
  });

  it("形式が違う月を渡したら、黙って誤らずにエラーにする", () => {
    expect(() => previousMonthKey("2025")).toThrowError("YYYY-MM");
    expect(() => previousMonthKey("")).toThrowError("YYYY-MM");
  });

  it("12 月から 1 月をまたいでも前月比を出せる", () => {
    const rows = [
      makeRow({ order_date: "2025-12-01", revenue: 100, cost: 40 }),
      makeRow({ order_date: "2026-01-01", revenue: 150, cost: 60 }),
    ];
    expect(calcMonthlyKpis(rows).map((k) => k.revenueMoM)).toEqual([null, 50]);
  });

  it("前月の売上が 0 なら、前月比は null（0 で割れないため）", () => {
    const rows = [
      makeRow({ order_date: "2025-10-01", revenue: 0, cost: 0 }),
      makeRow({ order_date: "2025-11-01", revenue: 100, cost: 40 }),
    ];
    expect(calcMonthlyKpis(rows).map((k) => k.revenueMoM)).toEqual([null, null]);
  });

  it("月が抜けている場合、前月比は null にする", () => {
    // 9 月と 11 月だけ（10 月が無い）
    const rows = [
      makeRow({ order_date: "2025-09-01", revenue: 100, cost: 40 }),
      makeRow({ order_date: "2025-11-01", revenue: 200, cost: 80 }),
    ];
    const kpis = calcMonthlyKpis(rows);

    // 11 月を 9 月と比べて「+100%」と出してはいけない
    expect(kpis.map((k) => k.revenueMoM)).toEqual([null, null]);
  });
});

describe("リピート率の数え方", () => {
  it("同じ人が同じ月に 2 回買っても 1 人と数える", () => {
    const rows = [
      makeRow({ order_date: "2025-11-01", customer_id: "C001" }),
      makeRow({ order_date: "2025-11-20", customer_id: "C001" }),
    ];
    expect(calcMonthlyKpis(rows)[0].buyerCount).toBe(1);
  });

  it("customer_id が空の行は人数に数えないが、売上には含める", () => {
    const rows = [
      makeRow({ order_date: "2025-11-01", customer_id: null, revenue: 1000, cost: 400 }),
      makeRow({ order_date: "2025-11-02", customer_id: "C001", revenue: 500, cost: 200 }),
    ];
    const kpi = calcMonthlyKpis(rows)[0];

    expect(kpi.buyerCount).toBe(1);
    expect(kpi.revenue).toBe(1500);
  });

  it("買った人が 1 人もいない月は null（0% と区別する）", () => {
    const rows = [makeRow({ order_date: "2025-11-01", customer_id: null })];
    expect(calcMonthlyKpis(rows)[0].repeatRate).toBeNull();
  });

  it("前の月に買った人は、翌月にリピーターとして数える", () => {
    const rows = [
      makeRow({ order_date: "2025-10-01", customer_id: "C001" }),
      makeRow({ order_date: "2025-11-01", customer_id: "C001" }),
      makeRow({ order_date: "2025-11-02", customer_id: "C002" }),
    ];
    const november = calcMonthlyKpis(rows)[1];

    expect(november.buyerCount).toBe(2);
    expect(november.repeatBuyerCount).toBe(1);
    expect(november.repeatRate).toBe(50);
  });
});

describe("境界のケース", () => {
  it("データが無ければ空の配列を返す", () => {
    expect(calcMonthlyKpis([])).toEqual([]);
  });

  it("売上が 0 なら粗利率は null（0% と区別する）", () => {
    const rows = [makeRow({ revenue: 0, cost: 0 })];
    expect(calcMonthlyKpis(rows)[0].grossMarginRate).toBeNull();
  });

  it("小数を含む金額も、小数第 2 位まで正しく合計する", () => {
    const rows = [
      makeRow({ order_date: "2025-11-01", revenue: 0.1, cost: 0 }),
      makeRow({ order_date: "2025-11-02", revenue: 0.2, cost: 0 }),
    ];
    expect(calcMonthlyKpis(rows)[0].revenue).toBe(0.3);
  });

});
