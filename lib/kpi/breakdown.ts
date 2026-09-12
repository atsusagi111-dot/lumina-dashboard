// カテゴリ別売上・SKU ランキング・全期間リピート率を計算する。
// monthly.ts と同じく、ここも純粋関数だけで書く。

import type { SalesRow } from "@/lib/sales-row";
import { rateOf, roundMoney } from "@/lib/kpi/round";
import { toMonthKey } from "@/lib/kpi/monthly";

/** カテゴリが空の行をまとめる名前 */
export const UNCATEGORIZED = "未分類";

export type CategorySales = {
  category: string;
  revenue: number;
  /** 対象期間の売上に占める割合（％）。売上が 0 なら null */
  share: number | null;
};

export type SkuSales = {
  sku: string;
  /** その SKU で最初に現れた商品名 */
  productName: string;
  revenue: number;
  quantity: number;
};

export type OverallRepeatRate = {
  /** customer_id が分かる顧客の総数 */
  totalCustomers: number;
  /** 2 か月以上にわたって買った顧客の数 */
  repeatCustomers: number;
  /** リピート率（％）。顧客が 0 人なら null */
  rate: number | null;
};

type Options = {
  /** "2025-11" を渡すとその月だけを集計する。省略すると全期間 */
  month?: string;
};

function filterByMonth(rows: SalesRow[], month?: string): SalesRow[] {
  if (!month) return rows;
  return rows.filter((row) => toMonthKey(row.order_date) === month);
}

/**
 * 金額の降順に並べる。同額なら名前順にして、実行するたびに順番が変わらないようにする。
 */
function byRevenueDesc<T extends { revenue: number }>(nameOf: (item: T) => string) {
  return (a: T, b: T) => b.revenue - a.revenue || nameOf(a).localeCompare(nameOf(b), "ja");
}

/** カテゴリ別の売上。構成比つき。カテゴリが空の行は「未分類」にまとめる */
export function calcCategoryBreakdown(rows: SalesRow[], options: Options = {}): CategorySales[] {
  const target = filterByMonth(rows, options.month);

  const revenueByCategory = new Map<string, number>();
  for (const row of target) {
    const category = row.category?.trim() || UNCATEGORIZED;
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + row.revenue);
  }

  const totalRevenue = roundMoney(target.reduce((sum, row) => sum + row.revenue, 0));

  return [...revenueByCategory.entries()]
    .map(([category, revenue]) => ({
      category,
      revenue: roundMoney(revenue),
      share: rateOf(roundMoney(revenue), totalRevenue),
    }))
    .sort(byRevenueDesc((item) => item.category));
}

/**
 * SKU ごとの売上ランキング。
 * SKU が空の行は順位を付けられないので除外する（売上の合計には含まれている）。
 */
export function calcTopSkus(rows: SalesRow[], options: Options & { limit?: number } = {}): SkuSales[] {
  const { limit = 10 } = options;
  const target = filterByMonth(rows, options.month);

  const bySku = new Map<string, SkuSales>();
  for (const row of target) {
    const sku = row.sku?.trim();
    if (!sku) continue;

    const current = bySku.get(sku);
    if (current) {
      current.revenue += row.revenue;
      current.quantity += row.quantity;
    } else {
      bySku.set(sku, { sku, productName: row.product_name, revenue: row.revenue, quantity: row.quantity });
    }
  }

  return [...bySku.values()]
    .map((item) => ({ ...item, revenue: roundMoney(item.revenue) }))
    .sort(byRevenueDesc((item) => item.sku))
    .slice(0, limit);
}

/**
 * 全期間のリピート率。
 * 2 か月以上にわたって買った顧客を「リピーター」と数える。
 */
export function calcOverallRepeatRate(rows: SalesRow[]): OverallRepeatRate {
  const monthsByCustomer = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.customer_id) continue;
    let months = monthsByCustomer.get(row.customer_id);
    if (!months) {
      months = new Set();
      monthsByCustomer.set(row.customer_id, months);
    }
    months.add(toMonthKey(row.order_date));
  }

  const totalCustomers = monthsByCustomer.size;
  let repeatCustomers = 0;
  for (const months of monthsByCustomer.values()) {
    if (months.size >= 2) repeatCustomers += 1;
  }

  return { totalCustomers, repeatCustomers, rate: rateOf(repeatCustomers, totalCustomers) };
}
