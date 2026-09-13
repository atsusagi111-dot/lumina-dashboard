// OpenAI 呼び出しのテスト。実際の API は呼ばず、偽のクライアントを渡して挙動だけを確かめる。
// 実物を呼ぶ確認は pnpm test:analysis（Snapshot テスト）で行う。

import { generateReport, MAX_ATTEMPTS, type ReportClient } from "@/lib/analysis/generate-report";
import type { AnalysisInput } from "@/lib/analysis/build-input";
import type { Report } from "@/lib/analysis/report-schema";

const INPUT: AnalysisInput = {
  targetMonth: "2025-11",
  monthly: [{ month: "2025-11", revenue: 264700, grossProfit: 163100, repeatRate: 46.7 }],
  momChange: { revenue: 79.5, grossProfit: 76.1 },
  byCategory: [{ category: "アウター", revenue: 198200, share: 74.9 }],
  topSkus: [{ sku: "LUM-OUT-01", productName: "ウールコート", revenue: 99200, quantity: 4 }],
};

const VALID_REPORT: Report = {
  summary: "11 月はアウターが牽引し、売上は前月比 +79.5% の約 26 万円となりました。",
  highlights: ["アウターが売上の 74.9% を占める"],
  concerns: ["アクセサリーの構成比が 5.6% と低い"],
  actions: [{ priority: "high", action: "ウールコートの在庫を 20% 積み増す" }],
};

/** 呼ばれるたびに、渡された配列の先頭から順に返す偽クライアント */
function createFakeClient(responses: Array<unknown | Error>) {
  const calls: Array<{ model: string; messages: Array<{ role: string; content: string }> }> = [];
  const client: ReportClient = {
    chat: {
      completions: {
        parse: async (body) => {
          calls.push({ model: body.model, messages: body.messages });
          const next = responses[calls.length - 1];
          if (next instanceof Error) throw next;
          return { choices: [{ message: { parsed: next ?? null } }] };
        },
      },
    },
  };
  return { client, calls };
}

describe("AI 分析の生成", () => {
  it("1 回目で正しい形が返れば、それを使う", async () => {
    const { client, calls } = createFakeClient([VALID_REPORT]);

    const result = await generateReport(INPUT, client);

    expect(result).toEqual({ ok: true, report: VALID_REPORT });
    expect(calls.length).toBe(1);
  });

  it("集計データだけを渡し、明細や顧客 ID は送らない", async () => {
    const { client, calls } = createFakeClient([VALID_REPORT]);

    await generateReport(INPUT, client);

    const userMessage = calls[0].messages.find((message) => message.role === "user");
    expect(userMessage?.content).toBe(JSON.stringify(INPUT));
    expect(userMessage?.content).not.toMatch(/customer/);
  });

  it("形が違う応答が続いても、3 回目に成功すれば使える", async () => {
    const { client, calls } = createFakeClient([null, { summary: "形が違う" }, VALID_REPORT]);

    const result = await generateReport(INPUT, client);

    expect(result).toEqual({ ok: true, report: VALID_REPORT });
    expect(calls.length).toBe(3);
  });

  it("通信エラーが起きても、次の回で成功すれば使える", async () => {
    const { client, calls } = createFakeClient([new Error("通信エラー"), VALID_REPORT]);

    const result = await generateReport(INPUT, client);

    expect(result.ok).toBe(true);
    expect(calls.length).toBe(2);
  });

  it("3 回とも失敗したら、例外ではなく日本語のメッセージを返す", async () => {
    const { client, calls } = createFakeClient([null, null, null]);

    const result = await generateReport(INPUT, client);

    expect(result).toEqual({
      ok: false,
      message: "AI 分析の生成に失敗しました。時間をおいて再実行してください。",
    });
    expect(calls.length).toBe(MAX_ATTEMPTS);
  });

  it("空のサマリーなど、スキーマに合わない内容は受け付けない", async () => {
    const { client } = createFakeClient([
      { ...VALID_REPORT, summary: "" },
      { ...VALID_REPORT, actions: [] },
      { ...VALID_REPORT, actions: [{ priority: "urgent", action: "至急" }] },
    ]);

    const result = await generateReport(INPUT, client);

    expect(result.ok).toBe(false);
  });
});
