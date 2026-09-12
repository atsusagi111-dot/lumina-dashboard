// 月ごとの KPI（売上・粗利・粗利率・リピート率・前月比）を計算する。
//
// ここは純粋関数だけで書く（データベースにも API にも触らない）。
// 入力が同じなら必ず同じ結果になるので、Excel の集計と突き合わせて検証できる。

import type { SalesRow } from "@/lib/sales-row";
import { rateOf, roundMoney } from "@/lib/kpi/round";

export type MonthlyKpi = {
  /** "2025-11" の形 */
  month: string;
  revenue: number;
  grossProfit: number;
  /** 粗利率（％）。売上が 0 なら null */
  grossMarginRate: number | null;
  /** その月に買った人数（customer_id が空の行は数えない） */
  buyerCount: number;
  /** そのうち、その月より前にも買ったことがある人数 */
  repeatBuyerCount: number;
  /** リピート率（％）。買った人が 0 人なら null */
  repeatRate: number | null;
  /** 売上の前月比（％）。前月のデータが無ければ null */
  revenueMoM: number | null;
  /** 粗利の前月比（％）。前月のデータが無ければ null */
  grossProfitMoM: number | null;
};

/** "2025-11-03" → "2025-11" */
export function toMonthKey(orderDate: string): string {
  return orderDate.slice(0, 7);
}

/**
 * カレンダー上の前月を返す。"2025-01" → "2024-12"
 *
 * 配列の 1 つ前ではなくカレンダーで求めるのは、
 * 10 月のデータが抜けている場合に 11 月と 9 月を比べてしまわないようにするため。
 */
export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

type MonthBucket = {
  revenue: number;
  cost: number;
  customerIds: Set<string>;
};

function groupByMonth(rows: SalesRow[]): Map<string, MonthBucket> {
  const months = new Map<string, MonthBucket>();

  for (const row of rows) {
    const month = toMonthKey(row.order_date);
    let bucket = months.get(month);
    if (!bucket) {
      bucket = { revenue: 0, cost: 0, customerIds: new Set() };
      months.set(month, bucket);
    }
    bucket.revenue += row.revenue;
    bucket.cost += row.cost;
    // 匿名購入（customer_id が空）はリピート率の対象外。売上・粗利には含める
    if (row.customer_id) bucket.customerIds.add(row.customer_id);
  }

  return months;
}

/** 顧客ごとに「初めて買った月」を求める */
function firstPurchaseMonthByCustomer(rows: SalesRow[]): Map<string, string> {
  const firstMonths = new Map<string, string>();

  for (const row of rows) {
    if (!row.customer_id) continue;
    const month = toMonthKey(row.order_date);
    const known = firstMonths.get(row.customer_id);
    if (!known || month < known) firstMonths.set(row.customer_id, month);
  }

  return firstMonths;
}

/**
 * 月ごとの KPI を、古い月から順に返す。
 *
 * リピート率の定義：その月に買った人のうち、その月より前にも買ったことがある人の割合。
 * 最初の月は「過去に買った人が 0 人」なので 0.0%（null ではない）。
 */
export function calcMonthlyKpis(rows: SalesRow[]): MonthlyKpi[] {
  const months = groupByMonth(rows);
  const firstMonths = firstPurchaseMonthByCustomer(rows);

  const totals = new Map<string, { revenue: number; grossProfit: number }>();
  for (const [month, bucket] of months) {
    totals.set(month, {
      revenue: roundMoney(bucket.revenue),
      grossProfit: roundMoney(bucket.revenue - bucket.cost),
    });
  }

  return [...months.keys()]
    .sort()
    .map((month) => {
      const bucket = months.get(month)!;
      const total = totals.get(month)!;

      const buyerCount = bucket.customerIds.size;
      let repeatBuyerCount = 0;
      for (const customerId of bucket.customerIds) {
        // 初めて買った月がこの月より前 = すでに購入履歴がある人
        if ((firstMonths.get(customerId) ?? month) < month) repeatBuyerCount += 1;
      }

      const previous = totals.get(previousMonthKey(month));

      return {
        month,
        revenue: total.revenue,
        grossProfit: total.grossProfit,
        grossMarginRate: rateOf(total.grossProfit, total.revenue),
        buyerCount,
        repeatBuyerCount,
        repeatRate: buyerCount === 0 ? null : rateOf(repeatBuyerCount, buyerCount),
        revenueMoM: previous ? rateOf(total.revenue - previous.revenue, previous.revenue) : null,
        grossProfitMoM: previous
          ? rateOf(total.grossProfit - previous.grossProfit, previous.grossProfit)
          : null,
      };
    });
}
