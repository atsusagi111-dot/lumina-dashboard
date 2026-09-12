-- ============================================================
-- 0001_init.sql — テーブルの作成
-- Supabase の SQL Editor に貼り付けて Run してください。
-- 何度実行しても壊れないよう、既にある場合は作らない書き方にしています。
-- ============================================================

-- 取り込みログ：いつ・どのスプレッドシートから・何行取り込んだかの記録
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  -- 取り込んだ人。auth.users は Supabase がログイン用に持っているテーブル
  user_id uuid not null references auth.users (id) on delete cascade,
  spreadsheet_id text not null,
  sheet_name text not null,
  row_count integer not null,
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
  quantity integer not null,
  revenue numeric not null,
  cost numeric not null
);

-- AI 分析レポート：1 回の取り込みに対して 1 件
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads (id) on delete cascade,
  summary text not null,
  highlights jsonb,
  concerns jsonb,
  actions jsonb,
  generated_at timestamptz not null default now()
);

-- インデックス：よく検索する列に付けておくと集計が速くなる
create index if not exists sales_data_upload_id_idx on public.sales_data (upload_id);
create index if not exists sales_data_order_date_idx on public.sales_data (order_date);
create index if not exists sales_data_category_idx on public.sales_data (category);
create index if not exists uploads_user_id_idx on public.uploads (user_id);
create index if not exists reports_upload_id_idx on public.reports (upload_id);
