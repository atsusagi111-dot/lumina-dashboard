// AI 分析の Server Action のテスト。
//
// 本物の Supabase・OpenAI にはつながず、周辺をすべて差し替えて「判断の流れ」だけを確かめる。
// ここは料金が発生する処理の入口なので、作らない判断（月のずれ・連打）が効くかを重点的に見る。

import { generateAnalysis } from "@/app/analysis-actions";
import { INITIAL_ANALYSIS_STATE, REGENERATE_COOLDOWN_MS } from "@/lib/analysis/analysis-state";
import type { Report } from "@/lib/analysis/report-schema";
import { makeRow } from "../helpers/sample-rows";

const REPORT: Report = {
  summary: "11 月はアウターが牽引しました。",
  highlights: ["アウターが 74.9%"],
  concerns: [],
  actions: [{ priority: "high", action: "在庫を積み増す" }],
};

// 売上データの読み出し・生成・認可は、それぞれのファイルのテストで確かめてある
const loadSalesRows = vi.hoisted(() => vi.fn());
const generateReport = vi.hoisted(() => vi.fn());
type UpsertResult = { error: { message: string } | null };
const upsert = vi.hoisted(() =>
  vi.fn(
    async (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ): Promise<UpsertResult> => {
      // 引数は mock.calls から確かめる。ここでは受け取るだけ
      void values;
      void options;
      return { error: null };
    },
  ),
);
const reportRow = vi.hoisted(() => ({ current: null as { generated_at: string } | null }));

vi.mock("@/lib/dashboard/load-sales-rows", () => ({ loadSalesRows }));
vi.mock("@/lib/analysis/generate-report", () => ({ generateReport }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/require-user", () => ({
  requireUser: async () => ({
    userId: "user-1",
    email: "test@example.com",
    supabase: {
      from: () => {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: reportRow.current, error: null }),
          upsert,
        };
        return chain;
      },
    },
  }),
}));

function formDataFor(targetMonth: string): FormData {
  const formData = new FormData();
  formData.set("targetMonth", targetMonth);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  reportRow.current = null;
  loadSalesRows.mockResolvedValue({
    ok: true,
    uploadId: "upload-1",
    uploadedAt: "2025-12-01T00:00:00Z",
    rows: [makeRow({ order_date: "2025-11-03" }), makeRow({ order_date: "2025-10-03", customer_id: "C002" })],
  });
  generateReport.mockResolvedValue({ ok: true, report: REPORT });
});

describe("AI 分析の生成（Server Action）", () => {
  it("生成した内容を、対象月つきで保存する", async () => {
    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.status).toBe("success");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({
      upload_id: "upload-1",
      target_month: "2025-11",
      summary: REPORT.summary,
    });
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "upload_id,target_month" });
  });

  it("売上データが読めなければ、OpenAI を呼ばない", async () => {
    loadSalesRows.mockResolvedValue({ ok: false });

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.status).toBe("error");
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("まだ取り込みが無ければ、取り込みを促す", async () => {
    loadSalesRows.mockResolvedValue({ ok: true, uploadId: null, uploadedAt: null, rows: [] });

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.message).toContain("取り込");
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("データに無い月を指定されたら、別の月を作らずに知らせる", async () => {
    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2024-01"));

    expect(state.status).toBe("error");
    expect(generateReport).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("作ったばかりの月は、続けて作り直さない（料金の無駄を防ぐ）", async () => {
    reportRow.current = { generated_at: new Date().toISOString() };

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.status).toBe("error");
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("時間が経っていれば作り直せる", async () => {
    reportRow.current = {
      generated_at: new Date(Date.now() - REGENERATE_COOLDOWN_MS - 1000).toISOString(),
    };

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.status).toBe("success");
    expect(generateReport).toHaveBeenCalledTimes(1);
  });

  it("生成に失敗したら、保存はしない", async () => {
    generateReport.mockResolvedValue({ ok: false, message: "AI 分析の生成に失敗しました。" });

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state).toEqual({ status: "error", message: "AI 分析の生成に失敗しました。" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("保存に失敗したら、その旨を伝える", async () => {
    upsert.mockResolvedValue({ error: { message: "保存できません" } });

    const state = await generateAnalysis(INITIAL_ANALYSIS_STATE, formDataFor("2025-11"));

    expect(state.status).toBe("error");
    expect(state.message).toContain("保存");
  });
});
