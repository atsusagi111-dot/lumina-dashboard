// AI 分析の Snapshot テスト（pnpm test:analysis）。
//
// 目的：プロンプトを変えたときに、出力の質が落ちていないかを **実際に API を呼んで** 確かめる。
// LLM の文章は毎回少し変わるので、完全一致ではなく「触れているべき内容」で判定する。
//
// 実行すると少額（1 回あたり 1 円未満）の課金が発生するため、普段の pnpm test には含めていない。
// OPENAI_API_KEY が無い環境（CI の一部など）では、まるごとスキップする。

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAnalysisInput } from "@/lib/analysis/build-input";
import { generateReport } from "@/lib/analysis/generate-report";
import { calcCategoryBreakdown, calcTopSkus } from "@/lib/kpi/breakdown";
import { calcMonthlyKpis } from "@/lib/kpi/monthly";
import { loadSampleRows } from "../helpers/sample-rows";
import { loadEnvLocal } from "../helpers/load-env-local";

loadEnvLocal();

const TARGET_MONTH = "2025-11";
const SNAPSHOT_PATH = resolve(process.cwd(), "tests/analysis/__snapshots__/latest-report.json");

describe.skipIf(!process.env.OPENAI_API_KEY)("AI 分析の実際の出力", () => {
  it("サンプルデータから、報告に使える分析を生成する", async () => {
    const rows = loadSampleRows();
    const input = buildAnalysisInput({
      targetMonth: TARGET_MONTH,
      monthlyKpis: calcMonthlyKpis(rows),
      categories: calcCategoryBreakdown(rows, { month: TARGET_MONTH }),
      topSkus: calcTopSkus(rows, { month: TARGET_MONTH, limit: 10 }),
    });

    const result = await generateReport(input);
    if (!result.ok) throw new Error(result.message);
    const report = result.report;

    // 生成結果を残す。人が読んで日本語の質を確かめるためのもので、差分はテストの合否に関係しない
    mkdirSync(resolve(SNAPSHOT_PATH, ".."), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), input, report }, null, 2)}\n`,
      "utf8",
    );

    // ① 11 月はアウターが牽引しているので、そこに触れていること
    const leadText = [report.summary, ...report.highlights].join("");
    expect(leadText).toMatch(/アウター|ウールコート|ダウン/);

    // ② 前月との比較に触れていること
    expect(leadText).toMatch(/前月|%|％|倍/);

    // ③ すぐ動けるアクションが 1 つ以上あること
    expect(report.actions.some((action) => action.priority === "high")).toBe(true);
  });
});
