-- ============================================================
-- 0005_reports_by_user.sql — AI 分析を「ユーザー × 月」で持つようにする差分
-- 実行が必要かどうかは README §5-4 ③ を参照してください。
--
-- これまでの reports は「取り込み（upload_id）× 月」で保存していました。
-- 取り込みは毎月やり直す運用なので、そのたびに紐づけ先が変わり、
-- 前の月までに作った分析が画面から見えなくなっていました。
-- また、同じ取り込みの 2 か月目を保存しようとすると、古い unique (upload_id) が
-- 残っている環境ではエラーになっていました。
--
-- ここでは「誰の・何月の分析か」で 1 件に決まるようにします。
-- upload_id は「どの取り込みのデータで作ったか」の記録として残します
-- （取り込みが消えたら参照だけ外す。分析そのものは残す）。
--
-- このファイルは行を削除する箇所があります（所有者が分からない行・同じ月の重複）。
-- 気になる場合は、Run する前に次の 2 つを実行して件数を確かめてください。どちらも 0 件なら何も消えません。
--   select count(*) from public.reports r
--     left join public.uploads u on r.upload_id = u.id where u.id is null;
--   select user_id, target_month, count(*) from public.reports group by 1, 2 having count(*) > 1;
-- ============================================================

begin;

-- ① 所有者の列を足す。既定値は今ログインしている人
alter table public.reports
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- ② 既存の行は、紐づく取り込みの所有者で埋める
update public.reports r
set user_id = u.user_id
from public.uploads u
where r.upload_id = u.id
  and r.user_id is null;

-- ③ 所有者が分からない行は残しても使えないので消す（取り込みごと消された分析）
delete from public.reports where user_id is null;

alter table public.reports alter column user_id set not null;
alter table public.reports alter column user_id set default auth.uid();

-- ④ 取り込みが消えても分析は残す（記録としての参照に変える）
alter table public.reports alter column upload_id drop not null;
alter table public.reports drop constraint if exists reports_upload_id_fkey;
alter table public.reports
  add constraint reports_upload_id_fkey
  foreign key (upload_id) references public.uploads (id) on delete set null;

-- ⑤ 一意性を「ユーザー × 月」に張り替える。
--    同じ月の分析が 2 件あると張り替えられないため、新しい 1 件だけを残す
delete from public.reports r
using public.reports keep
where r.user_id = keep.user_id
  and r.target_month = keep.target_month
  and (r.generated_at, r.id) < (keep.generated_at, keep.id);

alter table public.reports drop constraint if exists reports_upload_id_key;
alter table public.reports drop constraint if exists reports_upload_id_target_month_key;
alter table public.reports drop constraint if exists reports_user_id_target_month_key;
alter table public.reports
  add constraint reports_user_id_target_month_key unique (user_id, target_month);

-- ⑥ RLS：所有者は自分自身の行（取り込みをたどる必要がなくなった）
drop policy if exists "reports_own_rows" on public.reports;
create policy "reports_own_rows"
  on public.reports
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  -- upload_id（どの取り込みで作ったかの記録）までは検査しない。
  -- 毎回の副問い合わせに見合う効果が無いため（他人の取り込み ID を入れても、読める情報は増えない）
  with check (user_id = (select auth.uid()));

commit;
