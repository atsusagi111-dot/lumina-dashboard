// hooks 共通処理（lint-check.mjs / stop-check.mjs から使う）

import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

// Claude Code が標準入力に渡す JSON（編集したファイルのパスなど）を読む
export function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

// 指定パスから上へたどり、package.json があるフォルダ（= プロジェクトのルート）を返す。
// worktree（別フォルダ）で編集しているときも、そのフォルダの package.json を見つけられる。
export function findProjectRoot(startPath) {
  let dir = resolve(startPath);
  if (!isDirectory(dir)) dir = dirname(dir);
  while (true) {
    if (existsSync(resolve(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// pnpm コマンドを実行する。Windows では pnpm.cmd なので shell 経由で呼び、引数は自前でクォートする。
export function runPnpm(args, cwd) {
  const result = spawnPnpm(args, cwd);
  if (result.status === 0) return { ok: true, output: "" };

  // 失敗したときだけ pnpm 自体の有無を確かめる（成功時に余分なプロセスを起動しないため）
  const pnpmMissing = spawnPnpm(["--version"], cwd).status !== 0;
  return {
    ok: false,
    output: pnpmMissing
      ? "pnpm が見つかりません。`npm i -g pnpm` でインストールしてください。"
      : `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`.trim(),
  };
}

function spawnPnpm(args, cwd) {
  const command = `pnpm ${args.map((a) => `"${a}"`).join(" ")}`;
  return spawnSync(command, { cwd, encoding: "utf8", shell: true });
}

// package.json の scripts に名前があるか
export function hasScript(projectRoot, name) {
  const pkg = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
  return Boolean(pkg.scripts?.[name]);
}
