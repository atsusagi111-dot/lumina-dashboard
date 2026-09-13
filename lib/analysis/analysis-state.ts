// AI 分析の生成ボタンの状態。
//
// "use server" を付けたファイルは async 関数しか公開できない（Next.js 16）。
// 型や定数はこちらに置く。取り込み画面の lib/sheets/import-state.ts と同じ考え方。

export type AnalysisState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_ANALYSIS_STATE: AnalysisState = { status: "idle", message: "" };

/**
 * 続けて生成し直せるようになるまでの時間（ミリ秒）。
 *
 * 生成 1 回ごとに料金がかかるため、ボタンの連打や複数タブからの同時押しで
 * 何度も呼ばれないようにサーバー側でも止める（画面のボタンを無効にするだけでは防げない）。
 */
export const REGENERATE_COOLDOWN_MS = 30_000;
