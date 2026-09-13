// データベースに保存された AI 分析を、画面で使える形に戻す。
//
// highlights / concerns / actions は jsonb 列なので、型の上では「何でも入りうる」値になる。
// 画面で落ちないよう、読み出したところで ReportSchema にかけて確かめる。

import { ReportSchema, type Report } from "@/lib/analysis/report-schema";

export type StoredReportRow = {
  summary: string;
  highlights: unknown;
  concerns: unknown;
  actions: unknown;
  generated_at: string;
};

export type StoredReport = Report & { generatedAt: string };

/** 保存されている行を検証して返す。形が違えば null（古い形式が残っていても画面を壊さない） */
export function parseStoredReport(row: StoredReportRow | null): StoredReport | null {
  if (!row) return null;

  const parsed = ReportSchema.safeParse({
    summary: row.summary,
    highlights: row.highlights,
    concerns: row.concerns,
    actions: row.actions,
  });
  if (!parsed.success) {
    console.error("保存されている AI 分析の形が期待と違います", parsed.error.issues);
    return null;
  }

  return { ...parsed.data, generatedAt: row.generated_at };
}
