import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // globals: describe / it / expect を import なしで使えるようにする設定。
    // Testing Library の「テストごとに画面を片付ける」処理も、これが有効なときだけ働く。
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    // tsconfig.json の "@/*" と同じ意味にする
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
