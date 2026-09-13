// 「どの月を表示するか」を決める純粋関数。
//
// URL の ?month=2025-10 で切り替える。URL に持たせると、表示中の月をそのまま共有できる。

/**
 * 表示する月を選ぶ。
 *
 * @param months 集計できた月（古い順。calcMonthlyKpis の並びをそのまま渡す）
 * @param requested URL から受け取った値。文字列以外（配列・undefined）も来る
 * @returns 選んだ月。データが 1 件も無ければ null
 *
 * 指定が無いときや、指定された月のデータが無いときは最新月を返す。
 * 古いブックマークや打ち間違いで空の画面が出るより、最新月を出すほうが親切なため。
 */
export function selectMonth(months: string[], requested: string | string[] | undefined): string | null {
  if (months.length === 0) return null;

  const latest = months[months.length - 1];
  if (typeof requested !== "string") return latest;

  return months.includes(requested) ? requested : latest;
}
