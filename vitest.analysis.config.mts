import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// AI 分析の Snapshot テスト専用の設定（pnpm test:analysis）。
//
// 普段の pnpm test と分けている理由：このテストは本物の OpenAI API を呼ぶため、
// 実行するたびに少額の課金が発生する。うっかり CI で毎回回さないよう、入口を別にしている。
export default defineConfig({
  test: {
    globals: true,
    // 実際の API を呼ぶだけなので、ブラウザの真似（jsdom）は不要
    environment: "node",
    include: ["tests/**/*.snapshot.test.ts"],
    // 応答に 10 秒以上かかることがある
    testTimeout: 120_000,
    env: { NODE_ENV: "test" },
    // OPENAI_API_KEY は、テストの中で tests/helpers/load-env-local.ts が .env.local から読む
    // （Vitest は Next.js と違い .env.local を自動では読まないため）
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
