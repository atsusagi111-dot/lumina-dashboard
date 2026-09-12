import type { ReactNode } from "react";

type Props = {
  /** ヘッダー右側に出す内容（ログイン情報など）。省略時は何も出さない */
  children?: ReactNode;
};

// 全ページ共通のヘッダー（白 × ネイビー）
export function SiteHeader({ children }: Props) {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <p className="text-lg font-bold tracking-wide">LUMINA</p>
          <p className="text-xs text-navy-pale">売上分析ダッシュボード</p>
        </div>
        {children}
      </div>
    </header>
  );
}
