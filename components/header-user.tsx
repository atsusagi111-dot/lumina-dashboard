import { getOptionalUser } from "@/lib/supabase/require-user";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * ヘッダー右側の「ログイン中のメールアドレス + ログアウト」部分。
 *
 * レイアウト本体から切り出している理由：ここは Supabase への問い合わせを待つ必要があるため、
 * 待っている間もページ本文を先に表示できるよう <Suspense> で包めるようにしている。
 */
export async function HeaderUser() {
  const user = await getOptionalUser();

  if (!user) {
    return <p className="text-xs text-navy-pale sm:text-sm">月次レポート</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <p className="hidden text-xs text-navy-pale sm:block">{user.email}</p>
      <SignOutButton />
    </div>
  );
}
