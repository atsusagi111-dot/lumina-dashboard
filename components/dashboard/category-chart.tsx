"use client";

// カテゴリ別売上の横棒グラフ。
// 円グラフではなく横棒にしている理由：カテゴリ名が日本語で長く、横棒のほうが名前を読みやすいため。

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategorySales } from "@/lib/kpi/breakdown";
import { formatAxisYen, formatPercent, formatYen } from "@/lib/dashboard/format";

type Props = {
  items: CategorySales[];
};

/** 上位から濃いネイビー → 淡い色へ。順位の差が色でも分かるようにする */
const BAR_COLORS = ["var(--color-navy)", "var(--color-navy-light)", "#6b83bb", "#9aabd4"];

export function CategoryChart({ items }: Props) {
  // カテゴリ 1 つあたりの高さを確保する（カテゴリ数が増えても棒がつぶれない）
  const height = Math.max(160, items.length * 44 + 40);
  // 軸の単位（万円 / 円）を決めるため、いちばん大きい金額を渡す
  const maxRevenue = Math.max(0, ...items.map((item) => item.revenue));

  return (
    <div className="mt-3 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-navy-pale)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatAxisYen(value, maxRevenue)}
            stroke="var(--color-ink-muted)"
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={84}
            stroke="var(--color-ink-muted)"
            fontSize={12}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              // Recharts は payload の中身に型を付けられない（どんな形のデータでも渡せるため）。
              // ここに入るのは下の Bar に渡した items の 1 件なので CategorySales として読む
              const share = (entry?.payload as CategorySales | undefined)?.share ?? null;
              return [`${formatYen(typeof value === "number" ? value : null)}（${formatPercent(share)}）`, "売上"];
            }}
          />
          <Bar dataKey="revenue" name="売上" radius={[0, 4, 4, 0]}>
            {items.map((item, index) => (
              <Cell key={item.category} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
