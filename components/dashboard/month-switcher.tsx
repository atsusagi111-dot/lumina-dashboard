import Link from "next/link";
import { formatShortMonthLabel } from "@/lib/dashboard/format";

type Props = {
  /** 選べる月（古い順） */
  months: string[];
  /** いま表示している月 */
  selected: string;
};

/**
 * 表示する月を切り替えるボタン列。
 *
 * ボタンではなくリンク（?month=...）にしているので、JavaScript が動く前でも使えて、
 * 表示中の月をそのまま URL で共有できる。
 */
export function MonthSwitcher({ months, selected }: Props) {
  // 新しい月を左に置く（見たいのはたいてい直近の月のため）
  const ordered = [...months].reverse();

  return (
    <nav aria-label="表示する月" className="flex flex-wrap gap-2">
      {ordered.map((month) => {
        const isSelected = month === selected;
        return (
          <Link
            key={month}
            href={`/?month=${encodeURIComponent(month)}`}
            aria-current={isSelected ? "page" : undefined}
            className={
              isSelected
                ? "rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-md border border-navy-pale px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-navy-pale"
            }
          >
            {formatShortMonthLabel(month)}
          </Link>
        );
      })}
    </nav>
  );
}
