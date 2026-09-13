// 画面に出す文字列を作る純粋関数。
//
// ここに集める理由：「null は —」「前月比はプラスなら緑」といった見せ方の決まりが
// 画面のあちこちに散らばると、直し漏れで表示がばらつくため。

/** 計算できないときの表示。KPI の定義上 null になる場合に使う（.claude/skills/kpi-calculation/SKILL.md） */
export const NOT_AVAILABLE = "—";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  // 円は小数点以下を出さない（DB は小数第 2 位まで持つが、報告書では 1 円単位で足りる）
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("ja-JP");

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

/**
 * 0 との差がごく小さい値を 0 に寄せる。
 *
 * -0 や -0.04 をそのまま表示すると「-￥0」「-0.0%」のように、
 * 実際には 0 なのにマイナスが付いた見た目になるため。
 */
function normalizeZero(value: number, digits: number): number {
  return Math.abs(value) < 0.5 / 10 ** digits ? 0 : value;
}

/** 24800 → "￥24,800"。null は "—" */
export function formatYen(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return yenFormatter.format(normalizeZero(value, 0));
}

/** 1234 → "1,234" */
export function formatCount(value: number): string {
  return countFormatter.format(value);
}

/** 46.7 → "46.7%"。null は "—" */
export function formatPercent(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return `${normalizeZero(value, 1).toFixed(1)}%`;
}

/**
 * グラフの軸ラベル用の金額。軸は幅が狭いので万円単位にする。
 * ただし全体が 1 万円未満だと目盛りが「0万」ばかりになって読めないので、そのときは円のまま出す。
 */
export function formatAxisYen(value: number, maxValue: number): string {
  if (value === 0) return "0";
  if (maxValue < 10000) return countFormatter.format(Math.round(value));
  return `${Math.round(value / 10000)}万`;
}

/** 取り込み日時。"2025-11-30T12:00:00Z" → "2025年11月30日 21:00"（日本時間） */
export function formatDateTime(isoText: string): string {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;
  return dateTimeFormatter.format(date);
}

/** 前月比の向き。none は「前月のデータが無く、比べられない」 */
export type MomDirection = "up" | "down" | "flat" | "none";

export type Mom = {
  /** 例："+79.5%" / "-0.6%" / "—" */
  text: string;
  direction: MomDirection;
};

/** 前月比（％）を、符号つきの文字列と向きに直す。向きから文字色を決める */
export function formatMom(value: number | null): Mom {
  if (value === null) return { text: NOT_AVAILABLE, direction: "none" };

  const rate = normalizeZero(value, 1);
  if (rate === 0) return { text: "±0.0%", direction: "flat" };

  const sign = rate > 0 ? "+" : "-";
  return {
    text: `${sign}${Math.abs(rate).toFixed(1)}%`,
    direction: rate > 0 ? "up" : "down",
  };
}

/** 前月比の向きに対応する文字色のクラス（色の値は app/globals.css の @theme） */
export function momColorClass(direction: MomDirection): string {
  if (direction === "up") return "text-up";
  if (direction === "down") return "text-down";
  return "text-ink-muted";
}

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** "2025-11" → "2025年11月"。想定外の形はそのまま返す（画面を落とさない） */
export function formatMonthLabel(month: string): string {
  const matched = MONTH_PATTERN.exec(month);
  if (!matched) return month;
  return `${matched[1]}年${Number(matched[2])}月`;
}

/** "2025-11" → "11月"。月の切り替えボタンのように、幅が狭い場所で使う */
export function formatShortMonthLabel(month: string): string {
  const matched = MONTH_PATTERN.exec(month);
  if (!matched) return month;
  return `${Number(matched[2])}月`;
}
