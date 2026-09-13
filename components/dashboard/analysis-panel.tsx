"use client";

// AI 分析コメントの表示と、生成ボタン。
//
// "use client" を付ける理由：生成ボタンを押している間「生成中…」と出したいため
// （useActionState はブラウザ側で動く）。分析そのものはサーバーで作る。

import { useActionState } from "react";
import { generateAnalysis } from "@/app/analysis-actions";
import { INITIAL_ANALYSIS_STATE } from "@/lib/analysis/analysis-state";
import type { ActionPriority } from "@/lib/analysis/report-schema";
import type { StoredReport } from "@/lib/analysis/stored-report";
import { formatDateTime, formatMonthLabel } from "@/lib/dashboard/format";

type Props = {
  targetMonth: string;
  /** 保存済みの分析。まだ作っていなければ null */
  report: StoredReport | null;
};

// 優先度の見せ方（文言と色）。1 枚の表にまとめておき、増やすときの直し漏れを防ぐ
const PRIORITY_BADGES: Record<ActionPriority, { label: string; className: string }> = {
  high: { label: "優先度 高", className: "bg-down-pale text-down" },
  medium: { label: "優先度 中", className: "bg-navy-pale text-navy" },
  low: { label: "優先度 低", className: "bg-navy-pale/60 text-ink-muted" },
};

export function AnalysisPanel({ targetMonth, report }: Props) {
  const [state, formAction, isPending] = useActionState(generateAnalysis, INITIAL_ANALYSIS_STATE);
  const monthLabel = formatMonthLabel(targetMonth);

  return (
    <section className="rounded-lg border border-navy-pale bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy">AI 分析コメント</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {report
              ? `${monthLabel}の分析（${formatDateTime(report.generatedAt)} 作成）`
              : `${monthLabel}の集計から、サマリーと翌月のアクション提案を作ります。`}
          </p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="targetMonth" value={targetMonth} />
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "生成中…（10 秒ほど）" : report ? "再生成" : "AI 分析を生成"}
          </button>
        </form>
      </div>

      {state.status === "success" && (
        <p role="status" className="mt-4 rounded-md bg-navy-pale px-3 py-2 text-sm text-navy">
          {state.message}
        </p>
      )}

      {state.status === "error" && (
        <p role="alert" className="mt-4 rounded-md bg-down-pale px-3 py-2 text-sm text-down">
          {state.message}
        </p>
      )}

      {report ? (
        <div className="mt-4 space-y-5">
          <p className="leading-relaxed text-ink">{report.summary}</p>

          <AnalysisList title="注目ポイント" items={report.highlights} />
          {report.concerns.length > 0 && <AnalysisList title="懸念点" items={report.concerns} />}

          <div>
            <h3 className="text-sm font-bold text-navy">翌月のアクション提案</h3>
            <ul className="mt-2 space-y-2">
              {report.actions.map((action, index) => (
                <li
                  key={`${index}-${action.action}`}
                  className="flex flex-col gap-1 rounded-md border border-navy-pale p-3 sm:flex-row sm:items-start sm:gap-3"
                >
                  <span
                    className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGES[action.priority].className}`}
                  >
                    {PRIORITY_BADGES[action.priority].label}
                  </span>
                  <span className="text-sm leading-relaxed text-ink">{action.action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          まだ分析はありません。ボタンを押すと作成します（1 回あたり 1 円未満の費用がかかります）。
        </p>
      )}
    </section>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-navy">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
