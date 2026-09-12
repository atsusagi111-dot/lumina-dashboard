import Link from "next/link";

// 存在しない URL を開いたときの画面（Next.js 標準の英語ページを日本語に差し替える）
export default function NotFound() {
  return (
    <section className="card">
      <p className="text-sm font-medium text-navy-light">404</p>
      <h1 className="mt-2 text-2xl font-bold text-navy">ページが見つかりません</h1>
      <p className="mt-4 leading-relaxed text-ink-muted">
        URL が変わったか、削除された可能性があります。
      </p>
      <Link href="/" className="btn-primary mt-6 inline-block">
        トップへ戻る
      </Link>
    </section>
  );
}
