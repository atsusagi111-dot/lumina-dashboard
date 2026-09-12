// 「テストの仕組みが動いているか」を確かめる最小のテスト
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site-header";

describe("SiteHeader", () => {
  it("ブランド名を表示する", () => {
    render(<SiteHeader />);
    expect(screen.getByText("LUMINA")).toBeInTheDocument();
  });
});
