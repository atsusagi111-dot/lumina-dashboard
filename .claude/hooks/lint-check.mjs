// PostToolUse フック：Claude がファイルを編集・作成した直後に自動で走る。
// 編集された TypeScript / JavaScript ファイル 1 つに ESLint をかけ、
// エラーがあれば終了コード 2 で stderr に出す（→ Claude がその場で気づいて直せる）。
// 型チェックはプロジェクト全体が対象で時間がかかるため、ここではやらず stop-check.mjs で 1 回だけ行う。

import { findProjectRoot, readHookInput, runPnpm } from "./lib.mjs";

const CHECK_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const SKIP_DIRS = ["/.claude/", "/node_modules/", "/.next/"];

const filePath = (readHookInput().tool_input?.file_path ?? "").replaceAll("\\", "/");
const isTarget =
  CHECK_EXTENSIONS.some((ext) => filePath.endsWith(ext)) && !SKIP_DIRS.some((d) => filePath.includes(d));
const projectRoot = isTarget ? findProjectRoot(filePath) : null;

// 対象外のファイル、または package.json が見つからない（まだ Next.js を入れていない）なら何もしない
if (!projectRoot) process.exit(0);

const lint = runPnpm(["exec", "eslint", "--cache", "--cache-location", "node_modules/.cache/eslint/", filePath], projectRoot);
if (!lint.ok) {
  console.error(`lint-check フック：ESLint のエラーを修正してください。\n[${filePath}]\n${lint.output}`);
  process.exit(2);
}
