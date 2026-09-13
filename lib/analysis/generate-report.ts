// OpenAI を呼んで、AI 分析コメントを 1 件作る。
//
// 失敗しても例外を投げず、成否を値で返す（画面側で日本語のメッセージを出したいため）。

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { openaiApiKey, openaiModel } from "@/lib/env";
import type { AnalysisInput } from "@/lib/analysis/build-input";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompt";
import { ReportSchema, type Report } from "@/lib/analysis/report-schema";

/**
 * 何回まで試すか。
 *
 * AI の出力が決められた形にならないことが、まれに起きる。
 * そのたびに失敗を見せるより、黙って数回試す方が使い勝手がよい。ただし 1 回ごとに課金されるので 3 回まで。
 */
export const MAX_ATTEMPTS = 3;

/** 混み合っているときの待ち時間（ミリ秒）。1 回目の失敗後に 1 秒、2 回目の後に 2 秒待つ */
const RETRY_WAIT_MS = 1000;

const FAILURE_MESSAGE = "AI 分析の生成に失敗しました。時間をおいて再実行してください。";
const SETUP_MESSAGE =
  "AI 分析の設定が終わっていません。.env.local の OPENAI_API_KEY を設定して、開発サーバーを再起動してください。";

export type GenerateReportResult = { ok: true; report: Report } | { ok: false; message: string };

/** テストから偽物を渡せるように、使う機能だけを型にしておく */
export type ReportClient = {
  chat: {
    completions: {
      parse: (body: {
        model: string;
        messages: Array<{ role: "system" | "user"; content: string }>;
        response_format: ReturnType<typeof zodResponseFormat>;
      }) => Promise<{ choices: Array<{ message: { parsed: unknown | null } }> }>;
    };
  };
};

function createClient(): ReportClient {
  // 型注釈だけで受ける（as を使わない）。SDK の形が変わったら、ここで型エラーになって気づける
  const client: ReportClient = new OpenAI({ apiKey: openaiApiKey() });
  return client;
}

/**
 * 何度試しても結果が変わらないエラーかどうか。
 * 認証エラー（401）や権限エラー（403）は、待っても直らないのですぐ諦める。
 */
function isPermanentError(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  return status === 401 || status === 403 || status === 404;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 集計データから分析コメントを作る。
 *
 * 出力の形は Structured Outputs（response_format）で強制しているが、
 * 拒否応答などで parsed が null になることがあるため、こちらでも ReportSchema で検証する。
 */
export async function generateReport(
  input: AnalysisInput,
  injectedClient?: ReportClient,
): Promise<GenerateReportResult> {
  let client: ReportClient;
  try {
    // createClient() は API キーが未設定だと例外を投げる。
    // ここで受け止めないと、画面に日本語の案内ではなく汎用のエラー画面が出てしまう
    client = injectedClient ?? createClient();
  } catch (error) {
    console.error("OpenAI クライアントを作れませんでした", error);
    return { ok: false, message: SETUP_MESSAGE };
  }

  const model = openaiModel();
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify(input) },
  ];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const completion = await client.chat.completions.parse({
        model,
        messages,
        response_format: zodResponseFormat(ReportSchema, "monthly_report"),
      });

      const parsed = ReportSchema.safeParse(completion.choices[0]?.message?.parsed);
      if (parsed.success) return { ok: true, report: parsed.data };

      console.error(`AI 分析の形が期待と違いました（${attempt} 回目）`, parsed.error.issues);
    } catch (error) {
      // 通信エラー・レート制限・キーの誤りなど。内容はサーバーのログにだけ出す
      console.error(`AI 分析の生成に失敗しました（${attempt} 回目）`, error);
      if (isPermanentError(error)) break;
    }

    // 混み合っている（429）ときに間を置かず打ち直すと、また弾かれるだけなので待つ
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_WAIT_MS * attempt);
  }

  return { ok: false, message: FAILURE_MESSAGE };
}
