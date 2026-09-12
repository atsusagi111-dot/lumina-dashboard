---
name: google-sheets-import
description: Google スプレッドシートから売上データを読み込み、8 列を検証して Supabase に保存する手順（Task 3 で使用）
---

# Google スプレッドシート取り込み 手順書

## 前提知識（初心者向け）
- **サービスアカウント**：人間ではなく「プログラム用の Google アカウント」。メールアドレスの形をしている。
- クライアントは自分のスプレッドシートを、このメールアドレス宛に「閲覧者」で共有するだけでよい。
- **Google Sheets API**：スプレッドシートの中身をプログラムから読むための窓口。

## 1. Google Cloud 側の設定（1 回だけ）
1. https://console.cloud.google.com → プロジェクトを新規作成（例：`lumina-dashboard`）
2. 「API とサービス」→「ライブラリ」→ **Google Sheets API** を検索して「有効にする」
3. 「API とサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
   - 名前：`lumina-sheets-reader`、ロールは不要（閲覧はシート共有で制御する）
4. 作成したサービスアカウント →「キー」タブ →「鍵を追加」→ JSON → ダウンロード
5. JSON の `client_email` を `GOOGLE_SERVICE_ACCOUNT_EMAIL`、`private_key` を `GOOGLE_PRIVATE_KEY` として `.env.local` に書く
   - 書き方は `.env.example` のコメントのとおり（`\n` を含む 1 行、ダブルクォートで囲む）
   - コードで読むときは `process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")` で改行に戻す
     - 文字としての `\n`（2 文字）を本物の改行に置換する。正規表現では `\\n` と 2 重に書く
     - ローカルは dotenv が自動で戻すが、Vercel では戻らないので必須

## 2. クライアント側の準備
列仕様と共有手順は **README §6 が唯一の正**（クライアントが読む場所）。Task 3 で手順を詳しくするときも README §6 を更新する。
実装で前提にする制約だけ書く：ヘッダー行あり、8 列固定、サービスアカウントは「閲覧者」権限、入力は URL または シート ID。

## 3. 実装手順（`lib/sheets/`）
1. **URL からシート ID を抽出**：`https://docs.google.com/spreadsheets/d/<ID>/edit...` の `<ID>` 部分。正規表現 `/\/d\/([a-zA-Z0-9-_]+)/`。ID を直接入力された場合もそのまま受け付ける
2. **読み込み**：`google-auth-library` の `JWT` で認証トークンを取り、Sheets REST API に `fetch` で問い合わせる（`GET /v4/spreadsheets/{id}/values/{シート名}!A1:H`）
   - `googleapis` は使わない。Google の全 API を含む巨大なパッケージで、必要なのは認証だけのため
   - スコープは読み取り専用 `https://www.googleapis.com/auth/spreadsheets.readonly`
   - シート名は既定で 1 枚目（`spreadsheets.get` で取得）。フォームで指定可能にする
3. **バリデーション**（Zod を使う）：
   | 列 | 型 | ルール |
   | --- | --- | --- |
   | order_date | 文字列 | `YYYY-MM-DD` 形式。`2025/11/03` も受け付けて正規化する |
   | customer_id | 文字列 | 空可（匿名購入）。空ならリピート率の分母から除外 |
   | product_name | 文字列 | 必須 |
   | category | 文字列 | 空可 |
   | sku | 文字列 | 空可 |
   | quantity | 整数 | 1 以上 |
   | revenue | 数値 | 0 以上。`¥` やカンマは除去してから数値化 |
   | cost | 数値 | 0 以上 |
   - ヘッダー行の列名が仕様と一致しない場合は「列名が違います：期待 `sku`、実際 `SKU番号`」のように示す
   - 完全に空の行はスキップする
4. **エラーメッセージ**は日本語で「行番号 + 列名 + 何が悪いか」を返す
   - 例：`5 行目の quantity「abc」は整数ではありません`
   - 全行を検証してから、エラーをまとめて返す（1 件目で止めない）
5. **保存**：Server Action 内で `uploads` に 1 件、`sales_data` に全行を **1 回の insert（配列）** で保存。途中で失敗したら `uploads` を削除して巻き戻す
6. 同じシートを再取り込みした場合は新しい `uploads` として登録し、ダッシュボードは最新の `uploads` を表示する

## 4. 確認方法
- `tests/fixtures/sample-sales.csv` と同じ内容のスプレッドシートを用意し、40 行が取り込まれること
- わざと `quantity` を文字列にした行を作り、日本語エラーが行番号つきで出ること
- 共有していないシートの URL を入れたとき「シートが共有されていません。<メール> を閲覧者として共有してください」と出ること
