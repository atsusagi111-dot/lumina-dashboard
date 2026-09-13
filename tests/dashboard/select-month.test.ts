import { selectMonth } from "@/lib/dashboard/select-month";

const MONTHS = ["2025-09", "2025-10", "2025-11"];

describe("表示する月の決定", () => {
  it("指定が無ければ最新月を選ぶ", () => {
    expect(selectMonth(MONTHS, undefined)).toBe("2025-11");
  });

  it("指定された月のデータがあればその月を選ぶ", () => {
    expect(selectMonth(MONTHS, "2025-09")).toBe("2025-09");
  });

  it("データが無い月を指定されたら最新月に戻す（空の画面を出さない）", () => {
    expect(selectMonth(MONTHS, "2024-01")).toBe("2025-11");
    expect(selectMonth(MONTHS, "")).toBe("2025-11");
    expect(selectMonth(MONTHS, "'; drop table")).toBe("2025-11");
  });

  it("?month= を 2 回書かれて配列で届いても落ちない", () => {
    expect(selectMonth(MONTHS, ["2025-09", "2025-10"])).toBe("2025-11");
  });

  it("データが 1 件も無ければ null を返す", () => {
    expect(selectMonth([], undefined)).toBeNull();
  });
});
