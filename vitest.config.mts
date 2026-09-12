import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // globals: describe / it / expect を import なしで使えるようにする設定。
    // Testing Library の「テストごとに画面を片付ける」処理も、これが有効なときだけ働く。
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    // tsconfig.json の "@/*" と同じ意味にする。
    // エイリアスを増やすときは tsconfig.json と両方直すこと。3 本目になったら vite-tsconfig-paths の導入を検討する。
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
