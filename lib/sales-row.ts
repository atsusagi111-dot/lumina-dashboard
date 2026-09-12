// 売上 1 行を表す型。スプレッドシートから取り込んだ行も、データベースから読んだ行も同じ形。
//
// 取り込み側（lib/sheets/）と集計側（lib/kpi/）の両方が使うため、ここを唯一の正とする。
// 列の意味は README §6 を参照。

export type SalesRow = {
  /** 注文日。必ず YYYY-MM-DD の形に揃っている */
  order_date: string;
  /** 顧客 ID。匿名購入は null。リピート率の計算からは除外する */
  customer_id: string | null;
  product_name: string;
  category: string | null;
  sku: string | null;
  quantity: number;
  revenue: number;
  cost: number;
};
