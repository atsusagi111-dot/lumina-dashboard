import type { Metadata } from "next";
import { ImportForm } from "./import-form";
import { googleServiceAccountEmail } from "@/lib/env";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata: Metadata = {
  title: "データの取り込み | LUMINA 売上分析ダッシュボード",
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

export default async function ImportPage() {
  const { supabase } = await requireUser();

  // RLS により、自分が取り込んだ記録だけが返る
  const { data, error } = await supabase
    .from("uploads")
    .select("id, sheet_name, row_count, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(5);

  if (error) console.error("取り込み履歴の読み込みに失敗しました", error);
  const uploads = data ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-bold text-navy">データの取り込み</h1>
        <p className="mt-2 mb-6 text-sm text-ink-muted">
          売上データを貼り付けた Google スプレッドシートの URL を入力してください。
          内容を確認したうえで保存します。1 行でも問題があれば、何も保存せずに内容をお知らせします。
        </p>
        <ImportForm serviceAccountEmail={googleServiceAccountEmail()} />
      </section>

      <section>
        <h2 className="text-base font-bold text-navy">最近の取り込み</h2>
        {error ? (
          <p className="mt-2 text-sm text-down">取り込み履歴を読み込めませんでした。画面を再読み込みしてください。</p>
        ) : uploads.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">まだ取り込みはありません。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy-pale text-left text-ink-muted">
                  <th className="py-2 pr-4 font-medium">日時</th>
                  <th className="py-2 pr-4 font-medium">シート名</th>
                  <th className="py-2 text-right font-medium">件数</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id} className="border-b border-navy-pale/50">
                    <td className="py-2 pr-4">{dateFormatter.format(new Date(upload.uploaded_at))}</td>
                    <td className="py-2 pr-4">{upload.sheet_name}</td>
                    <td className="py-2 text-right tabular-nums">{upload.row_count.toLocaleString("ja-JP")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
