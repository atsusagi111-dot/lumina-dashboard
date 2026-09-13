import { parseStoredReport, type StoredReportRow } from "@/lib/analysis/stored-report";

const ROW: StoredReportRow = {
  summary: "11 月はアウターが牽引しました。",
  highlights: ["アウターが 74.9%"],
  concerns: [],
  actions: [{ priority: "high", action: "在庫を積み増す" }],
  generated_at: "2025-12-01T00:00:00Z",
};

describe("保存された AI 分析の読み出し", () => {
  it("保存されている内容をそのまま返す", () => {
    expect(parseStoredReport(ROW)).toEqual({
      summary: ROW.summary,
      highlights: ["アウターが 74.9%"],
      concerns: [],
      actions: [{ priority: "high", action: "在庫を積み増す" }],
      generatedAt: "2025-12-01T00:00:00Z",
    });
  });

  it("まだ生成していなければ null", () => {
    expect(parseStoredReport(null)).toBeNull();
  });

  it("形が違う古いデータが残っていても、画面を壊さず null を返す", () => {
    expect(parseStoredReport({ ...ROW, actions: "文字列" })).toBeNull();
    expect(parseStoredReport({ ...ROW, highlights: null })).toBeNull();
  });
});
