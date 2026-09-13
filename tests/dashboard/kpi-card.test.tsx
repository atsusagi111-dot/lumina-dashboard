import { render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/dashboard/kpi-card";

describe("KPI カード", () => {
  it("見出しと値を表示する", () => {
    render(<KpiCard label="売上" value="￥264,700" />);

    expect(screen.getByText("売上")).toBeInTheDocument();
    expect(screen.getByText("￥264,700")).toBeInTheDocument();
  });

  it("前月比が増加なら緑で表示する", () => {
    render(<KpiCard label="売上" value="￥264,700" momRate={79.5} />);

    expect(screen.getByText("前月比 +79.5%")).toHaveClass("text-up");
  });

  it("前月比が減少なら赤で表示する", () => {
    render(<KpiCard label="売上" value="￥147,500" momRate={-0.6} />);

    expect(screen.getByText("前月比 -0.6%")).toHaveClass("text-down");
  });

  it("前月のデータが無ければ — を出す", () => {
    render(<KpiCard label="売上" value="￥148,400" momRate={null} />);

    expect(screen.getByText("前月比 —")).toBeInTheDocument();
  });

  it("前月比を渡さないカード（リピート率など）では前月比の行を出さない", () => {
    render(<KpiCard label="リピート率" value="46.7%" caption="前月 38.5%" />);

    expect(screen.queryByText(/前月比/)).not.toBeInTheDocument();
    expect(screen.getByText("前月 38.5%")).toBeInTheDocument();
  });
});
