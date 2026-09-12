// ログインが要るかどうか、ログイン後どこへ戻すかの判定。
// 画面からも proxy からも使うので、どちらにも依存しない普通の関数として置いている。

/** ログインしていなくても開いてよいパス */
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * ログイン不要のパスかどうか。
 * 前方一致だけで判定すると /login-preview のような別ページも通ってしまうため、
 * 「完全一致」か「その配下（/login/xxx）」だけを許す。
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * ログイン後に戻る先として安全かどうか。
 * 「/」で始まり「//」で始まらないパスだけを許す。
 * これを省くと、?next=https://悪いサイト のような細工で外部へ飛ばされてしまう。
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
