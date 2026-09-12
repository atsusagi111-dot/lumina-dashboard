// 月ごとの KPI（売上・粗利・粗利率・リピート率・前月比）を計算する。
//
// ここは純粋関数だけで書く（データベースにも API にも触らない）。
// 入力が同じなら必ず同じ結果になるので、Excel の集計と突き合わせて検証できる。

import type { SalesRow } from "@/lib/sales-row";
import { rateOf, roundMoney, toMonthKey } from "@/lib/kpi/round";

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

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/**
 * カレンダー上の前月を返す。"2025-01" → "2024-12"
 *
 * 配列の 1 つ前ではなくカレンダーで求めるのは、
 * 10 月のデータが抜けている場合に 11 月と 9 月を比べてしまわないようにするため。
 *
 * Date を使わず文字列のまま計算している。Date は 2 桁の年を 1900 年代と解釈するなど
 * 古い仕様が残っており、"0099-03" が "1999-02" になるような誤りを避けるため。
 */
export function previousMonthKey(month: string): string {
  const matched = MONTH_PATTERN.exec(month);
  if (!matched) {
    throw new Error(`月の形式が正しくありません（期待：YYYY-MM、実際：${month}）`);
  }

  const year = Number(matched[1]);
  const monthNumber = Number(matched[2]);
  const isJanuary = monthNumber === 1;

  return `${String(isJanuary ? year - 1 : year).padStart(4, "0")}-${String(
    isJanuary ? 12 : monthNumber - 1,
  ).padStart(2, "0")}`;
}

type MonthBucket = {
  /** 丸める前の生の合計。率の計算はこちらを使う */
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
 *
 * 丸めるのは返す直前の 1 回だけ。率は丸める前の生の合計から計算する。
 */
export function calcMonthlyKpis(rows: SalesRow[]): MonthlyKpi[] {
  const months = groupByMonth(rows);
  const firstMonths = firstPurchaseMonthByCustomer(rows);

  return [...months.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, bucket]) => {
      const grossProfit = bucket.revenue - bucket.cost;

      const buyerCount = bucket.customerIds.size;
      let repeatBuyerCount = 0;
      for (const customerId of bucket.customerIds) {
        // 初めて買った月がこの月より前 = すでに購入履歴がある人
        const firstMonth = firstMonths.get(customerId);
        if (firstMonth !== undefined && firstMonth < month) repeatBuyerCount += 1;
      }

      const previous = months.get(previousMonthKey(month));
      const previousGrossProfit = previous ? previous.revenue - previous.cost : null;

      return {
        month,
        revenue: roundMoney(bucket.revenue),
        grossProfit: roundMoney(grossProfit),
        grossMarginRate: rateOf(grossProfit, bucket.revenue),
        buyerCount,
        repeatBuyerCount,
        repeatRate: buyerCount === 0 ? null : rateOf(repeatBuyerCount, buyerCount),
        revenueMoM: previous ? rateOf(bucket.revenue - previous.revenue, previous.revenue) : null,
        grossProfitMoM:
          previousGrossProfit === null
            ? null
            : rateOf(grossProfit - previousGrossProfit, previousGrossProfit),
      };
    });
}
