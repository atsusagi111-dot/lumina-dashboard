import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";

export default async function HomePage() {
  const { supabase } = await requireUser();

  // RLS により、自分が取り込んだ記録だけが返る
  const { data: latest, error } = await supabase
    .from("uploads")
    .select("row_count, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 読み込み失敗を「0 件」と区別する。取り込み済みなのに未取り込みに見えると、二重取り込みの原因になる
  if (error) {
    console.error("取り込み状況の読み込みに失敗しました", error);
    return (
      <section className="card">
        <h1 className="text-2xl font-bold text-navy">取り込み状況を読み込めませんでした</h1>
        <p className="mt-4 leading-relaxed text-ink-muted">
          時間をおいて画面を再読み込みしてください。続くようなら管理者にご連絡ください。
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      {latest ? (
        <>
          <p className="text-sm font-medium text-navy-light">取り込み済み</p>
          <h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
            売上データ {latest.row_count.toLocaleString("ja-JP")} 件
          </h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            KPI カードと月次グラフは Task 5 で追加します。新しい月のデータは、取り込み画面から追加できます。
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-navy-light">はじめに</p>
          <h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">売上データを取り込みましょう</h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Google スプレッドシートに貼り付けた売上データを読み込むと、集計とグラフの準備が整います。
          </p>
        </>
      )}

      <Link
        href="/import"
        className="mt-6 inline-block rounded-md bg-navy px-4 py-2 font-medium text-white transition hover:bg-navy-light"
      >
        データを取り込む
      </Link>
    </section>
  );
}
