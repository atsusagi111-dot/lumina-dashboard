import type { SkuSales } from "@/lib/kpi/breakdown";
import { formatCount, formatYen } from "@/lib/dashboard/format";

type Props = {
  items: SkuSales[];
};

/** SKU 別の売上ランキング（上位 10 件）。SKU が空の行は集計側で除外されている */
export function SkuTable({ items }: Props) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">この月に SKU 付きの売上はありません。</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-md border-collapse text-sm">
        <thead>
          <tr className="border-b border-navy-pale text-left text-ink-muted">
            <th className="py-2 pr-3 font-medium">順位</th>
            <th className="py-2 pr-4 font-medium">商品</th>
            <th className="py-2 pr-4 text-right font-medium">売上</th>
            <th className="py-2 text-right font-medium">数量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.sku} className="border-b border-navy-pale/50">
              <td className="py-2 pr-3 tabular-nums text-ink-muted">{index + 1}</td>
              <td className="py-2 pr-4">
                <span className="font-medium text-ink">{item.productName}</span>
                <span className="ml-2 text-xs text-ink-muted">{item.sku}</span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatYen(item.revenue)}</td>
              <td className="py-2 text-right tabular-nums">{formatCount(item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
