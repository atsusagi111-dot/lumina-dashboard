import { formatMom, momColorClass } from "@/lib/dashboard/format";

type Props = {
  /** カードの見出し。例："売上" */
  label: string;
  /** すでに整形済みの値。例："¥264,700"（整形は lib/dashboard/format.ts が担当） */
  value: string;
  /** 前月比（％）。前月のデータが無ければ null */
  momRate?: number | null;
  /** 数値の下に出す補足。例："前月 38.5%" */
  caption?: string;
};

/** KPI を 1 つ大きく見せるカード（売上 / 粗利 / リピート率） */
export function KpiCard({ label, value, momRate, caption }: Props) {
  const mom = momRate === undefined ? null : formatMom(momRate);

  return (
    <div className="rounded-lg border border-navy-pale bg-surface p-5">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-navy tabular-nums">{value}</p>

      {mom && (
        <p className={`mt-2 text-sm font-medium tabular-nums ${momColorClass(mom.direction)}`}>
          前月比 {mom.text}
        </p>
      )}
      {caption && <p className="mt-1 text-xs text-ink-muted tabular-nums">{caption}</p>}
    </div>
  );
}
