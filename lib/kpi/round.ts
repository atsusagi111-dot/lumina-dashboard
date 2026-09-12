// 端数の扱いと、月キーの取り出しを 1 箇所に集める。
//
// 計算の途中では丸めず、最後に 1 回だけ丸める。
// 途中で丸めると誤差が積み重なり、Excel の集計と合わなくなるため。

/** 割合（％）。小数第 1 位まで。例：62.938... → 62.9 */
export function roundRate(value: number): number {
  return roundTo(value, 1);
}

/** 金額（円）。小数第 2 位まで。データベースが numeric(14,2) のため */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

/**
 * 指定した桁で四捨五入する。
 *
 * Math.round にそのまま渡すと、2 進数で表せない小数（8.165 は実際には 8.16499...）が
 * 切り捨て側に落ちてしまう。有効桁 15 桁に丸めてその誤差を落としてから整数化する。
 *
 * 絶対値にしてから丸めるのは、-1.005 を -1.01 にするため
 * （Math.round は -1.005 を -1.00 にする。日本の四捨五入と合わせる）。
 * 最後の + 0 は、結果が -0 になるのを 0 に直すためのもの。
 */
function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const scaled = Number((value * factor).toPrecision(15));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled))) / factor + 0;
}

/**
 * 割合を出す。分母が 0 のときは null（「計算できない」を 0% と区別するため）。
 *
 * 渡す値は丸める前の生の値にすること。丸めた値どうしで割ると誤差が二重にかかる。
 */
export function rateOf(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return roundRate((part / whole) * 100);
}

/** "2025-11-03" → "2025-11" */
export function toMonthKey(orderDate: string): string {
  return orderDate.slice(0, 7);
}
