import { SignOutButton } from "@/components/sign-out-button";

type Props = {
  /** ログイン中の人のメールアドレス。未ログインなら null */
  userEmail?: string | null;
};

// 全ページ共通のヘッダー（白 × ネイビー）
export function SiteHeader({ userEmail = null }: Props) {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <p className="text-lg font-bold tracking-wide">LUMINA</p>
          <p className="text-xs text-navy-pale">売上分析ダッシュボード</p>
        </div>
        {userEmail ? (
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-navy-pale sm:block">{userEmail}</p>
            <SignOutButton />
          </div>
        ) : (
          <p className="text-xs text-navy-pale sm:text-sm">月次レポート</p>
        )}
      </div>
    </header>
  );
}
