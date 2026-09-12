// 端数の扱いを 1 箇所に集める。
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
 * Math.round に頼るだけだと 1.005 が 1.00 になるなど、
 * 2 進数の誤差でずれることがある。いったん整数にしてから戻すことでそれを避ける。
 */
function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value * factor + Number.EPSILON * Math.sign(value) * factor)) / factor;
}

/**
 * 割合を出す。分母が 0 のときは null（「計算できない」を 0% と区別するため）。
 */
export function rateOf(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return roundRate((part / whole) * 100);
}
