---
name: openai-analysis
description: OpenAI API で月次集計から AI 分析コメント（サマリー + アクション提案）を JSON で生成し、Snapshot テストで品質を守る手順（Task 6 で使用）
---

# OpenAI 分析コメント 手順書

## 方針
- モデルは `gpt-4o-mini`（環境変数 `OPENAI_MODEL` で差し替え可能）。安価で JSON 出力が安定しているため。
- **生データを渡さない**。渡すのは `lib/kpi/` の集計結果（月次 KPI・前月比・カテゴリ別・SKU トップ 10）だけ。理由：トークン節約 + 精度向上 + 個人情報（customer_id）を外部に出さない。
- 出力は **Structured Outputs** で JSON スキーマを強制する。Zod スキーマからそのまま作れる `zodResponseFormat` を使う：
  ```ts
  import { zodResponseFormat } from "openai/helpers/zod";
  const completion = await openai.chat.completions.parse({
    model, messages,
    response_format: zodResponseFormat(ReportSchema, "monthly_report"),
  });
  const report = completion.choices[0].message.parsed; // 検証済みの型付きオブジェクト
  ```
  （手書きするなら `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }` の形。`json_schema` の入れ子を忘れると 400 エラーになる）
- 実装場所：`lib/analysis/prompt.ts`（system プロンプト）、`lib/analysis/report-schema.ts`（Zod スキーマ）、`lib/analysis/build-input.ts`（渡すデータの組み立て）、`lib/analysis/generate-report.ts`（呼び出し + リトライ）、`app/analysis-actions.ts`（Server Action）。

## system プロンプト（固定。変更時は Snapshot テストを必ず回す）

```
あなたは EC ブランドのデータコンサルタントです。
渡された月次集計データを分析し、必ず以下の JSON のみを出力してください。

{
  "summary": "今月の売上動向の総括（200 字以内、コンサルトーン）",
  "highlights": ["注目ポイント 1", "注目ポイント 2", "注目ポイント 3"],
  "concerns": ["懸念点 1", "懸念点 2"],
  "actions": [
    {"priority": "high",   "action": "翌月のアクション提案 1"},
    {"priority": "medium", "action": "翌月のアクション提案 2"}
  ]
}

注意事項:
- 数値は「約 X 円」「+Y%」のように具体的に書く
- 推測ではなく、データから読み取れる事実をベースにする
- アクション提案は実行可能な具体策にする
  （「広告を強化」ではなく「アウターの Instagram 広告予算を 30% 増額」のレベル）
- 前月との比較、カテゴリ別の貢献度に必ず触れる
- 渡されたデータに無い期間（前年同月・年間累計など）には言及しない
```

## user メッセージに渡す集計データの形

値は `lib/kpi/` の集計結果をそのまま入れる（数値の例は `docs/sample-data.md` の 2025-11 の行を参照。ここには複製しない）。

```json
{
  "targetMonth": "YYYY-MM",
  "monthly": [{ "month": "YYYY-MM", "revenue": 0, "grossProfit": 0, "repeatRate": 0.0 }],
  "momChange": { "revenue": 0.0, "grossProfit": 0.0 },
  "byCategory": [{ "category": "…", "revenue": 0, "share": 0.0 }],
  "topSkus": [{ "sku": "…", "productName": "…", "revenue": 0, "quantity": 0 }]
}
```

- `monthly` は対象月を含む直近 3 ヶ月、`byCategory` は対象月の全カテゴリ（構成比 `share` は %）、`topSkus` は対象月の上位 10 件。

## JSON スキーマと検証
- Zod で `ReportSchema` を定義：`summary: string(max 300)`, `highlights: string[]（1〜5）`, `concerns: string[]（0〜3）`, `actions: { priority: "high"|"medium"|"low", action: string }[]（1〜5）`
- `chat.completions.parse` + `zodResponseFormat` を使うと検証済みの `message.parsed` が返る。`parsed` が `null`（スキーマ不一致・拒否応答）なら **最大 2 回リトライ**（合計 3 回まで）。手動の `JSON.parse` は不要。
- ただし実装では、返ってきた `parsed` を **もう一度 `ReportSchema.safeParse` に通す**。SDK の検証に頼り切らず、空文字や項目数の違反をこちら側でも弾くため。
- リトライの間は 1 秒 → 2 秒待つ（混雑・429 対策）。認証エラー（401 / 403 / 404）は待っても直らないので、その場で打ち切る。
- `repeatRate` と `share` は、買った人が 0 人・売上が 0 円の月に `null` になる（KPI の定義どおり。数値固定ではない）。
- 3 回とも失敗したら「AI 分析の生成に失敗しました。時間をおいて再実行してください」を画面に表示し、`reports` には保存しない。
- 成功したら `reports` テーブルに保存し、同じ `upload_id` に対しては再生成ボタンを押さない限り再呼び出ししない（コスト節約）。

## Snapshot テスト（`pnpm test:analysis`）
- 目的：プロンプトを変えたとき、出力品質が落ちていないかを **実際に API を呼んで** 確かめる。
- `tests/analysis/report.snapshot.test.ts`：
  1. `tests/fixtures/sample-sales.csv` → KPI 集計 → OpenAI 呼び出し
  2. スキーマ検証が通ること
  3. **内容チェック**（LLM の出力は毎回少し変わるため、完全一致ではなくキーワードで判定）：
     - `summary` または `highlights` に「アウター」が含まれる（11 月はアウターが牽引しているため）。
       実装の判定は `アウター|ウールコート|ダウン`。カテゴリ名ではなく商品名で書かれることがあり、
       それは誤りではないため（見たいのは「牽引要因を拾えているか」）
     - 前月比に触れている（「前月比」「%」「倍」のいずれかを含む）
     - `actions` に `priority: "high"` が 1 つ以上ある
  4. 生成結果を `tests/analysis/__snapshots__/latest-report.json` に保存し、人が読んで確認できるようにする（このファイルの差分はテスト失敗にしない）
- `OPENAI_API_KEY` が無い環境ではスキップする（`describe.skipIf(!process.env.OPENAI_API_KEY)`）。CI では GitHub Secrets から渡す。

## コスト目安（確定値は README §10 が正。ここは算出根拠）
- 入力 約 1,500 トークン + 出力 約 500 トークン / 回
- gpt-4o-mini：入力 $0.15 / 100 万トークン、出力 $0.60 / 100 万トークン → **1 回あたり約 0.1 円**
- 月 100 回生成しても約 10 円。価格は変わるので Task 6 実装時に公式ページで再確認する。
