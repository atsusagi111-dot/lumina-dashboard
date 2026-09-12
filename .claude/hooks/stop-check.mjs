// Stop フック：Claude が 1 回の返答を終えるたびに自動で走る。
// 1. package.json に type-check スクリプトがあれば、プロジェクト全体の型チェックを 1 回実行し、
//    エラーがあれば終了コード 2 で知らせる（Claude は返答を終える前に直す）。
// 2. 「/code-review と /simplify を実行済みか」をリマインドする。
//
// stop_hook_active は「このフックの指摘を受けて Claude が続行中」の印。
// そのときは再びブロックしない（無限ループ防止）。

import { findProjectRoot, hasScript, readHookInput, runPnpm } from "./lib.mjs";

const input = readHookInput();
if (input.stop_hook_active) process.exit(0);

const projectRoot = findProjectRoot(input.cwd ?? process.cwd());
if (projectRoot && hasScript(projectRoot, "type-check")) {
  const typeCheck = runPnpm(["run", "type-check"], projectRoot);
  if (!typeCheck.ok) {
    console.error(`stop-check フック：型チェックのエラーを修正してください。\n${typeCheck.output}`);
    process.exit(2);
  }
}

console.log(
  JSON.stringify({
    systemMessage:
      "【リマインド】このタスクで /code-review と /simplify を実行済みですか？ 未実施なら CLAUDE.md §1 のサイクルを完了してから次のタスクへ進んでください。",
  }),
);
