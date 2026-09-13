import { render, screen } from "@testing-library/react";
import { SkuTable } from "@/components/dashboard/sku-table";
import type { SkuSales } from "@/lib/kpi/breakdown";

const ITEMS: SkuSales[] = [
  { sku: "LUM-OUT-01", productName: "ウールコート", revenue: 99200, quantity: 4 },
  { sku: "LUM-OUT-02", productName: "ダウンジャケット", revenue: 99000, quantity: 5 },
];

describe("SKU トップ 10 の表", () => {
  it("順位・商品名・SKU・売上・数量を並べる", () => {
    render(<SkuTable items={ITEMS} />);

    const firstRow = screen.getByText("ウールコート").closest("tr");
    expect(firstRow).not.toBeNull();
    expect(firstRow).toHaveTextContent("1");
    expect(firstRow).toHaveTextContent("LUM-OUT-01");
    expect(firstRow).toHaveTextContent("￥99,200");
    expect(firstRow).toHaveTextContent("4");
  });

  it("順位は 1 から振る", () => {
    render(<SkuTable items={ITEMS} />);

    const secondRow = screen.getByText("ダウンジャケット").closest("tr");
    expect(secondRow).toHaveTextContent("2");
  });

  it("SKU 付きの売上が無い月では、表の代わりに案内文を出す", () => {
    render(<SkuTable items={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("この月に SKU 付きの売上はありません。")).toBeInTheDocument();
  });
});
