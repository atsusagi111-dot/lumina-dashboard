import { render, screen } from "@testing-library/react";
import { AnalysisPanel } from "@/components/dashboard/analysis-panel";
import type { StoredReport } from "@/lib/analysis/stored-report";

// Server Action は本物の OpenAI につながるので、テストでは差し替える
const generateAnalysis = vi.hoisted(() => vi.fn(async () => ({ status: "idle" as const, message: "" })));
vi.mock("@/app/analysis-actions", () => ({ generateAnalysis }));

const REPORT: StoredReport = {
  summary: "11 月はアウターが牽引し、売上は前月比 +79.5% でした。",
  highlights: ["アウターが売上の 74.9%"],
  concerns: ["アクセサリーの構成比が低い"],
  actions: [
    { priority: "high", action: "ウールコートの在庫を 20% 積み増す" },
    { priority: "medium", action: "初回購入特典を用意する" },
  ],
  generatedAt: "2025-12-01T00:00:00Z",
};

describe("AI 分析コメントの表示", () => {
  it("まだ無いときは、生成ボタンと費用の案内を出す", () => {
    render(<AnalysisPanel targetMonth="2025-11" report={null} />);

    expect(screen.getByRole("button", { name: "AI 分析を生成" })).toBeInTheDocument();
    expect(screen.getByText(/1 回あたり 1 円未満/)).toBeInTheDocument();
  });

  it("生成済みなら、サマリー・注目ポイント・懸念点・アクションを出す", () => {
    render(<AnalysisPanel targetMonth="2025-11" report={REPORT} />);

    expect(screen.getByText(REPORT.summary)).toBeInTheDocument();
    expect(screen.getByText("アウターが売上の 74.9%")).toBeInTheDocument();
    expect(screen.getByText("アクセサリーの構成比が低い")).toBeInTheDocument();
    expect(screen.getByText("ウールコートの在庫を 20% 積み増す")).toBeInTheDocument();
  });

  it("アクションの優先度を日本語のバッジで示す", () => {
    render(<AnalysisPanel targetMonth="2025-11" report={REPORT} />);

    expect(screen.getByText("優先度 高")).toBeInTheDocument();
    expect(screen.getByText("優先度 中")).toBeInTheDocument();
  });

  it("生成済みならボタンは「再生成」になる", () => {
    render(<AnalysisPanel targetMonth="2025-11" report={REPORT} />);

    expect(screen.getByRole("button", { name: "再生成" })).toBeInTheDocument();
  });

  it("懸念点が無い月は、その見出しごと出さない", () => {
    render(<AnalysisPanel targetMonth="2025-11" report={{ ...REPORT, concerns: [] }} />);

    expect(screen.queryByText("懸念点")).not.toBeInTheDocument();
  });

  it("どの月の分析かを、送信する値としても持つ", () => {
    const { container } = render(<AnalysisPanel targetMonth="2025-10" report={null} />);

    expect(container.querySelector('input[name="targetMonth"]')).toHaveValue("2025-10");
  });
});
