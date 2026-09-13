"use server";

// AI 分析コメントを生成して保存する Server Action。
//
// ボタンを押したときだけ OpenAI を呼ぶ（画面を開くたびに課金されないようにするため）。
// 生成済みの月をもう一度押すと、上書きして作り直す（再生成）。

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildAnalysisInput } from "@/lib/analysis/build-input";
import { generateReport } from "@/lib/analysis/generate-report";
import { REGENERATE_COOLDOWN_MS, type AnalysisState } from "@/lib/analysis/analysis-state";
import type { Report } from "@/lib/analysis/report-schema";
import { loadSalesRows } from "@/lib/dashboard/load-sales-rows";
import { calcCategoryBreakdown, calcTopSkus } from "@/lib/kpi/breakdown";
import { calcMonthlyKpis } from "@/lib/kpi/monthly";
import { requireUser } from "@/lib/supabase/require-user";

export async function generateAnalysis(
  _prevState: AnalysisState,
  formData: FormData,
): Promise<AnalysisState> {
  // proxy でも未ログインは弾いているが、データを触る場所でもう一度確かめる
  const { supabase } = await requireUser();

  const loaded = await loadSalesRows(supabase);
  if (!loaded.ok) {
    return { status: "error", message: "売上データを読み込めませんでした。時間をおいてお試しください。" };
  }
  if (!loaded.uploadId) {
    return { status: "error", message: "先にスプレッドシートを取り込んでください。" };
  }

  const monthlyKpis = calcMonthlyKpis(loaded.rows);
  const requested = formData.get("targetMonth");
  const targetMonth = typeof requested === "string" ? requested : "";
  // 画面から来た月をそのまま信用しない。
  // ここで「近い月」に読み替えると、ボタンに出ていた月と保存される月がずれても誰も気づけないので、
  // 合わなければ作らずに知らせる（表示中に取り込み直された場合などに起きる）
  if (!monthlyKpis.some((kpi) => kpi.month === targetMonth)) {
    return {
      status: "error",
      message: "表示中の月のデータが変わりました。画面を更新してから、もう一度お試しください。",
    };
  }

  const cooldown = await findCooldown(supabase, loaded.uploadId, targetMonth);
  if (cooldown) return cooldown;

  const generated = await generateReport(
    buildAnalysisInput({
      targetMonth,
      monthlyKpis,
      categories: calcCategoryBreakdown(loaded.rows, { month: targetMonth }),
      topSkus: calcTopSkus(loaded.rows, { month: targetMonth, limit: 10 }),
    }),
  );
  if (!generated.ok) return { status: "error", message: generated.message };

  const saved = await saveReport(supabase, loaded.uploadId, targetMonth, generated.report);
  if (!saved) {
    return { status: "error", message: "AI 分析は作れましたが、保存に失敗しました。もう一度お試しください。" };
  }

  revalidatePath("/");
  return { status: "success", message: "AI 分析を作成しました。" };
}

/** 生成した分析を保存する（同じ取り込み・同じ月があれば上書き）。成功したら true */
async function saveReport(
  supabase: SupabaseClient<Database>,
  uploadId: string,
  targetMonth: string,
  report: Report,
): Promise<boolean> {
  const { error } = await supabase.from("reports").upsert(
    {
      upload_id: uploadId,
      target_month: targetMonth,
      summary: report.summary,
      highlights: report.highlights,
      concerns: report.concerns,
      actions: report.actions,
      // 再生成したときに「いつ作ったか」を更新したいので、ここで明示的に入れる
      // （DB の default now() は、新しく作るときにしか効かないため）
      generated_at: new Date().toISOString(),
    },
    { onConflict: "upload_id,target_month" },
  );

  if (error) console.error("AI 分析の保存に失敗しました", error);
  return !error;
}

/**
 * 直前に作ったばかりなら、作り直さずに知らせる（連打や複数タブでの多重生成を防ぐ）。
 * 作ってよければ null を返す。
 */
async function findCooldown(
  supabase: SupabaseClient<Database>,
  uploadId: string,
  targetMonth: string,
): Promise<AnalysisState | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("generated_at")
    .eq("upload_id", uploadId)
    .eq("target_month", targetMonth)
    .maybeSingle();

  // 確認できなかっただけで生成を止めると使えなくなるので、その場合は通す
  if (error || !data) return null;

  const elapsed = Date.now() - new Date(data.generated_at).getTime();
  if (Number.isNaN(elapsed) || elapsed >= REGENERATE_COOLDOWN_MS) return null;

  return {
    status: "error",
    message: `いま作成したばかりです。${Math.ceil((REGENERATE_COOLDOWN_MS - elapsed) / 1000)} 秒ほどおいてから、もう一度お試しください。`,
  };
}
