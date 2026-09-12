// 全ページ共通のヘッダー（白 × ネイビー）
export function SiteHeader() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <p className="text-lg font-bold tracking-wide">LUMINA</p>
          <p className="text-xs text-navy-pale">売上分析ダッシュボード</p>
        </div>
        <p className="text-xs text-navy-pale sm:text-sm">月次レポート</p>
      </div>
    </header>
  );
}
