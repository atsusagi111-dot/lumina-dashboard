"use client";

// 月次推移グラフ。棒＝売上・粗利（左軸、円）、折れ線＝リピート率（右軸、％）。
//
// "use client" を付ける理由：Recharts は描画領域の大きさをブラウザで測るため、
// サーバーでは動かせない。渡すのは集計済みの数字だけで、売上明細はブラウザに送らない。

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisYen, formatPercent, formatShortMonthLabel, formatYen } from "@/lib/dashboard/format";

export type TrendPoint = {
  month: string;
  revenue: number;
  grossProfit: number;
  repeatRate: number | null;
};

type Props = {
  points: TrendPoint[];
};

export function MonthlyTrendChart({ points }: Props) {
  // 軸の単位（万円 / 円）を決めるため、いちばん大きい金額を渡す
  const maxRevenue = Math.max(0, ...points.map((point) => point.revenue));

  return (
    // height を数値で決めるのは、ResponsiveContainer が高さ 0 の親の中では何も描かないため
    <div className="mt-3 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-navy-pale)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatShortMonthLabel}
            stroke="var(--color-ink-muted)"
            fontSize={12}
          />
          <YAxis
            yAxisId="money"
            tickFormatter={(value: number) => formatAxisYen(value, maxRevenue)}
            stroke="var(--color-ink-muted)"
            fontSize={12}
            width={44}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            unit="%"
            domain={[0, 100]}
            stroke="var(--color-ink-muted)"
            fontSize={12}
            width={44}
          />
          <Tooltip
            labelFormatter={(month) => (typeof month === "string" ? formatShortMonthLabel(month) : month)}
            formatter={(value, name) =>
              name === "リピート率"
                ? [formatPercent(typeof value === "number" ? value : null), name]
                : [formatYen(typeof value === "number" ? value : null), name]
            }
          />
          <Legend />
          <Bar yAxisId="money" dataKey="revenue" name="売上" fill="var(--color-navy)" radius={[4, 4, 0, 0]} />
          <Bar
            yAxisId="money"
            dataKey="grossProfit"
            name="粗利"
            fill="var(--color-navy-light)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="repeatRate"
            name="リピート率"
            stroke="var(--color-up)"
            strokeWidth={2}
            dot={{ r: 3 }}
            // リピート率が null（購入者 0 人）の月は線をつながない
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
