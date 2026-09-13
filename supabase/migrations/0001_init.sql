-- ============================================================
-- 0001_init.sql — テーブルの作成と RLS の有効化
-- 実行手順とマイグレーションの運用方針は README §5-4 ③ を参照してください。
-- 何度実行しても壊れないよう、既にある場合は作らない書き方にしています。
-- ============================================================

-- 取り込みログ：いつ・どのスプレッドシートから・何行取り込んだかの記録
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  -- 取り込んだ人。auth.users は Supabase がログイン用に持っているテーブル。
  -- default auth.uid() を付けておくと、アプリ側で入れ忘れても自分の ID が入る
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spreadsheet_id text not null,
  sheet_name text not null,
  row_count integer not null check (row_count >= 0),
  uploaded_at timestamptz not null default now()
);

-- 売上明細：スプレッドシートの 1 行が 1 レコード
create table if not exists public.sales_data (
  id uuid primary key default gen_random_uuid(),
  -- 取り込みログが消えたら、その明細もまとめて消す
  upload_id uuid not null references public.uploads (id) on delete cascade,
  order_date date not null,
  customer_id text,
  product_name text not null,
  category text,
  sku text,
  -- check（制約）を付けると、マイナスの数量や金額が保存される前に弾かれる。
  -- 人が手で編集するスプレッドシートが元データなので、DB 側で歯止めをかけておく
  quantity integer not null check (quantity >= 0),
  revenue numeric(14, 2) not null check (revenue >= 0),
  cost numeric(14, 2) not null check (cost >= 0)
);

-- AI 分析レポート：1 回の取り込みの 1 か月につき 1 件（unique で重複を防ぐ）
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads (id) on delete cascade,
  -- 対象の月（"2025-11" の形）。ダッシュボードの月切り替えと同じ単位で保存する。
  -- check は形だけを見る（2025-99 のような存在しない月は通る）
  target_month text not null check (target_month ~ '^\d{4}-\d{2}$'),
  summary text not null,
  highlights jsonb,
  concerns jsonb,
  actions jsonb,
  generated_at timestamptz not null default now(),
  unique (upload_id, target_month)
);

-- インデックス：よく検索する列に付けておくと集計が速くなる。
-- 月次集計は「ある取り込みの、ある期間」で引くので 2 列まとめた索引が効く
create index if not exists sales_data_upload_id_order_date_idx
  on public.sales_data (upload_id, order_date);
create index if not exists uploads_user_id_idx on public.uploads (user_id);
-- reports の (upload_id, target_month) は unique 制約が自動で索引を作るため、別途の索引は不要

-- RLS（行ごとのアクセス制限）をここで有効にしておく。
-- 理由：Supabase は新しいテーブルに既定で「誰でも読み書き」の権限を与える。
-- RLS を有効にすると、ポリシーが無いうちは全員拒否という安全な状態になる。
-- 実際に誰が何をできるかは 0002_rls.sql で決める。
alter table public.uploads enable row level security;
alter table public.sales_data enable row level security;
alter table public.reports enable row level security;
