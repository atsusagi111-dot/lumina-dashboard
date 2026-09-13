import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // globals: describe / it / expect を import なしで使えるようにする設定。
    // Testing Library の「テストごとに画面を片付ける」処理も、これが有効なときだけ働く。
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Snapshot テストは実際に OpenAI を呼ぶ（＝課金される）ので、普段の pnpm test では走らせない。
    // 実行するのは pnpm test:analysis（vitest.analysis.config.mts）のときだけ
    exclude: [...configDefaults.exclude, "tests/**/*.snapshot.test.ts"],
  },
  resolve: {
    // tsconfig.json の "@/*" と同じ意味にする。
    // エイリアスを増やすときは tsconfig.json と両方直すこと。3 本目になったら vite-tsconfig-paths の導入を検討する。
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
