# CLAUDE.md — LUMINA 売上分析ダッシュボード 開発ルール

このファイルは Claude Code が毎セッション自動で読む「プロジェクトの約束事」です。
ここに書かれたルールは、ユーザーの指示がない限り必ず守ること。

## 0. 相手について（最重要）

- ユーザーは **プログラミング初心者**。専門用語を使うときは必ず一言で補足する（例：「RLS（行ごとのアクセス制限）」）。
- 毎回「なぜそうするのか」「今どの段階にいるのか（Task 番号と工程）」を説明してから作業する。
- 選択肢を並べるだけで終わらず、推奨案を 1 つ示す。

## 1. 進め方のサイクル（1 タスクごとに必ずこの順で）

```
① プランモードで計画 → ② ユーザー承認 → ③ git worktree 作成
→ ④ 実装 → ⑤ /code-review → ⑥ /simplify → ⑦ 指摘の反映
→ ⑧ テスト → ⑨ README 更新 → ⑩ コミット → ⑪ main へマージ → ⑫ worktree 削除
```

- ②の承認前にコードを書かない。
- ⑤⑥が終わるまで次のタスクに進まない（Stop フックがリマインドする）。
- ⑨の README 更新は後回しにしない。`.claude/skills/readme-update/SKILL.md` のチェックリストに従う。
- タスクの一覧・内容・進捗は **README §4 の表が唯一の正**。worktree 名は `lumina-<タスク名>`（表の「worktree 名」列）。

### worktree の運用（main リポジトリ `C:\Users\kuuga\案件8` から実行）
```powershell
git worktree add ../lumina-<タスク名> -b feature/<タスク名>   # 作成。以降はそのフォルダで作業
git merge --no-ff feature/<タスク名>                           # 完了後、main で
git worktree remove ../lumina-<タスク名>
git branch -d feature/<タスク名>
```

## 2. 技術スタック

- Next.js（App Router）/ TypeScript（strict）/ Tailwind CSS / Recharts
- Supabase（PostgreSQL + Auth + RLS）
- OpenAI API（モデルは `.env.example` の `OPENAI_MODEL` が既定。JSON は Structured Outputs で受け取る）
- Google Sheets API（`googleapis` + サービスアカウント）
- パッケージマネージャ：**pnpm**（npm / yarn は使わない）
- テスト：Vitest
- ホスティング：Vercel / CI：GitHub Actions

## 3. コードの置き場所と責務

フォルダ構成の全体は README §9 を参照。責務のルールだけここに書く。

- `lib/kpi/`：KPI 集計の **純粋関数**（DB・API に触らない。テスト必須）
- `lib/analysis/`：OpenAI プロンプトと呼び出し
- `lib/sheets/`：Google Sheets 読み込みとバリデーション
- `lib/supabase/`：Supabase クライアント
- `app/`：画面（App Router）。Server Action はデータ取得と `lib/` 呼び出しに徹する
- `supabase/migrations/`：DB スキーマ
- `tests/`：テストと fixtures

## 4. 命名規則

- ファイル名：kebab-case（`kpi-card.tsx`, `calc-monthly.ts`）
- 変数・関数：camelCase（`calcRepeatRate`）
- 型・コンポーネント：PascalCase（`MonthlyKpi`, `KpiCard`）
- 定数：UPPER_SNAKE_CASE（`DEFAULT_MODEL`）
- DB 列名：snake_case（`order_date`）
- ブランチ：`feature/<タスク名>`

## 5. コミットメッセージ規約（Conventional Commits + 日本語）

```
<type>: <要約（日本語・50 字以内）>

<本文：何を・なぜ（任意）>
```

type：`feat`（機能追加）/ `fix`（バグ修正）/ `docs`（文書）/ `test`（テスト）/ `chore`（設定・雑務）/ `refactor`（挙動を変えない整理）

- 1 コミット 1 目的。大きな変更は分割する。
- コミット・マージはユーザーの承認後に行う。

## 6. 禁止事項

- `.env.local` や API キー・サービスアカウントの JSON をコミットしない（`.env.example` にキー名だけ書く）。
- `any` 型を安易に使わない（やむを得ない場合はコメントで理由を書く）。
- OpenAI に生データ（売上明細）を丸投げしない。必ず集計結果だけを渡す。
- Supabase の `service_role` キーをブラウザ側（`NEXT_PUBLIC_` 付き）に置かない。
- テストが落ちている状態でコミット・マージしない。
- ユーザーの承認なしに `git push` / `git merge` / 本番デプロイをしない。

## 7. 情報の置き場所（唯一の正）

同じ内容を 2 箇所に書かない。以下を正とし、他の場所からは参照する。

| 情報 | 唯一の正 |
| --- | --- |
| タスク一覧・進捗・worktree 名 | `README.md` §4 |
| スプレッドシートの列仕様・共有手順（クライアント向け） | `README.md` §6 |
| KPI の定義・計算式 | `.claude/skills/kpi-calculation/SKILL.md` |
| サンプルデータの正解値 | `docs/sample-data.md` |
| 環境変数の一覧と取得方法 | `.env.example` |
| ブランドカラーの定義 | `app/globals.css` の `@theme`（コメントに使い方も記載） |
| スプレッドシート取り込みの実装手順 | `.claude/skills/google-sheets-import/SKILL.md` |
| OpenAI 分析の実装手順・Snapshot テスト | `.claude/skills/openai-analysis/SKILL.md` |
| README 更新チェックリスト | `.claude/skills/readme-update/SKILL.md` |
| 月額コスト試算 | `README.md` §10 |
| hooks の動作仕様 | 各スクリプト冒頭のコメント（`.claude/hooks/`） |

## 8. hooks（自動実行される仕組み）

`.claude/settings.json` に定義。初心者向けの説明は README §9。
- **PostToolUse**（ファイル編集後）：`.claude/hooks/lint-check.mjs` — 編集した TS/JS ファイルに ESLint。
- **Stop**（返答終了時）：`.claude/hooks/stop-check.mjs` — 型チェックを 1 回実行 + `/code-review` `/simplify` のリマインド。

## 9. 品質基準

- `lib/kpi/` の計算結果は `docs/sample-data.md` の正解値と **完全一致** すること。
- 型チェック（`pnpm type-check`）・Lint（`pnpm lint`）・テスト（`pnpm test`）がすべて通ること。
- 画面はスマホ幅（375px）でも崩れないこと。
- ブランドカラー：白 + ネイビー `#1A2E5C`。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
