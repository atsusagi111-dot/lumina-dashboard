-- ============================================================
-- 0003_constraints.sql — 0001 を後から強化する差分
-- すでに 0001 を実行済みの場合に、こちらも SQL Editor で Run してください。
-- （まだ 0001 を実行していない場合は、最新の 0001 に含まれているので不要です）
-- ============================================================
-- 0001 の修正版を既存テーブルに反映する差分
alter table public.uploads alter column user_id set default auth.uid();
alter table public.uploads add constraint uploads_row_count_check check (row_count >= 0);
alter table public.sales_data add constraint sales_data_quantity_check check (quantity >= 0);
alter table public.sales_data add constraint sales_data_revenue_check check (revenue >= 0);
alter table public.sales_data add constraint sales_data_cost_check check (cost >= 0);
alter table public.sales_data alter column revenue type numeric(14,2);
alter table public.sales_data alter column cost type numeric(14,2);
alter table public.reports add constraint reports_upload_id_key unique (upload_id);
drop index if exists public.reports_upload_id_idx;
drop index if exists public.sales_data_upload_id_idx;
drop index if exists public.sales_data_order_date_idx;
drop index if exists public.sales_data_category_idx;
create index if not exists sales_data_upload_id_order_date_idx on public.sales_data (upload_id, order_date);
