-- ============================================================
-- 0002_rls.sql — RLS（行ごとのアクセス制限）の設定
-- 0001_init.sql の後に、SQL Editor で Run してください。
--
-- RLS とは：テーブルの「行」単位で誰が読み書きできるかをデータベース自身に守らせる仕組み。
-- アプリ側のコードに書き忘れがあっても、他人の行は返ってきません。
--
-- ポイント：auth.uid() は「今ログインしている人の ID」。
-- (select auth.uid()) と書くと 1 行ごとに計算し直さないので速くなります（Supabase 推奨）。
-- ============================================================

alter table public.uploads enable row level security;
alter table public.sales_data enable row level security;
alter table public.reports enable row level security;

-- 何度実行してもよいように、同名のポリシーがあれば消してから作り直す
drop policy if exists "uploads_own_rows" on public.uploads;
drop policy if exists "sales_data_own_rows" on public.sales_data;
drop policy if exists "reports_own_rows" on public.reports;

-- uploads：自分が取り込んだ行だけ、参照・追加・更新・削除できる
create policy "uploads_own_rows"
  on public.uploads
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- sales_data：upload_id をたどって、その取り込みが自分のものなら操作できる
create policy "sales_data_own_rows"
  on public.sales_data
  for all
  to authenticated
  using (
    exists (
      select 1 from public.uploads
      where uploads.id = sales_data.upload_id
        and uploads.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.uploads
      where uploads.id = sales_data.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );

-- reports：sales_data と同じ考え方
create policy "reports_own_rows"
  on public.reports
  for all
  to authenticated
  using (
    exists (
      select 1 from public.uploads
      where uploads.id = reports.upload_id
        and uploads.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.uploads
      where uploads.id = reports.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );
