-- ============================================================
-- 0002_rls.sql — RLS のポリシー（誰が何をできるか）
-- RLS の説明と、テーブルごとに何が見えるかは README §5-5 を参照してください。
-- RLS の有効化そのものは 0001_init.sql で実施済みです。
--
-- 【前提】このファイルは 0005 以降のスキーマ（reports に user_id がある状態）を想定しています。
-- 既存のデータベースで再実行する場合は、先に 0005_reports_by_user.sql を Run してください。
--
-- auth.uid() は「今ログインしている人の ID」。
-- (select auth.uid()) と書くと 1 行ごとに計算し直さないので速くなります（Supabase 推奨）。
-- ============================================================

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

-- reports：分析そのものに所有者（user_id）を持たせているので、直接くらべる
create policy "reports_own_rows"
  on public.reports
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
