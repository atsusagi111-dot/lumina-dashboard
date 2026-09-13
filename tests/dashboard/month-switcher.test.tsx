import { render, screen } from "@testing-library/react";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";

const MONTHS = ["2025-09", "2025-10", "2025-11"];

describe("月の切り替え", () => {
  it("新しい月から順に並べる（見たいのはたいてい直近の月のため）", () => {
    render(<MonthSwitcher months={MONTHS} selected="2025-11" />);

    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels).toEqual(["11月", "10月", "9月"]);
  });

  it("それぞれの月の URL を持つ", () => {
    render(<MonthSwitcher months={MONTHS} selected="2025-11" />);

    expect(screen.getByRole("link", { name: "9月" })).toHaveAttribute("href", "/?month=2025-09");
  });

  it("表示中の月が分かるようにする（読み上げ・見た目の両方）", () => {
    render(<MonthSwitcher months={MONTHS} selected="2025-10" />);

    const selected = screen.getByRole("link", { name: "10月" });
    expect(selected).toHaveAttribute("aria-current", "page");
    expect(selected).toHaveClass("bg-navy");
    expect(screen.getByRole("link", { name: "9月" })).not.toHaveAttribute("aria-current");
  });
});
