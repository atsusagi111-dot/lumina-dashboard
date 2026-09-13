-- ============================================================
-- 0004_reports_month.sql — AI 分析レポートを「取り込み × 月」で持てるようにする差分
-- 実行が必要かどうかは README §5-4 ③ を参照してください。
--
-- これまでの reports は upload_id に unique が付いており、1 回の取り込みにつき 1 件しか
-- 保存できませんでした。ダッシュボードは月を切り替えて見るため、月ごとに 1 件必要です。
--
-- 注意：target_month に既定値を置いていないため、既に reports に行があると失敗します。
-- AI 分析は Task 6 で初めて作る機能なので、この時点では 0 件のはずです。
-- もし失敗したら、中身を確認してから手で消すか、月を埋めてください（黙って消さないための作りです）。
-- ============================================================

-- if not exists を付けて、不安で 2 回 Run しても止まらないようにする
alter table public.reports add column if not exists target_month text not null;

-- "2025-11" の形だけを受け付ける（画面の月キーと同じ形に揃える）
-- 形（YYYY-MM）だけを見る。2025-99 のような「形は合っているが存在しない月」は通る
alter table public.reports drop constraint if exists reports_target_month_check;
alter table public.reports
  add constraint reports_target_month_check check (target_month ~ '^\d{4}-\d{2}$');

-- 「1 取り込みに 1 件」から「1 取り込みの 1 か月につき 1 件」へ張り替える
alter table public.reports drop constraint if exists reports_upload_id_key;
alter table public.reports drop constraint if exists reports_upload_id_target_month_key;
alter table public.reports
  add constraint reports_upload_id_target_month_key unique (upload_id, target_month);
