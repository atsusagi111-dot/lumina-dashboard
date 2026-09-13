// .env.local に書いた値を、テストからも使えるように読み込む。
//
// Next.js は起動時に .env.local を読んでくれるが、Vitest は読まない。
// Snapshot テスト（本物の OpenAI を呼ぶテスト）で OPENAI_API_KEY が必要なので、ここで補う。

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** .env.local の値を process.env に入れる。すでに設定済みの値は上書きしない */
export function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const matched = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!matched) continue;

    const [, name, rawValue] = matched;
    if (process.env[name]) continue;
    // 値が引用符で囲まれていれば外す。1 行で書かれた値だけを扱う（複数行にまたがる値は読めない）
    const quoted = rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2;
    process.env[name] = quoted ? rawValue.slice(1, -1) : rawValue;
  }
}
