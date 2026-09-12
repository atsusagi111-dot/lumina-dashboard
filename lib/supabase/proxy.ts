// すべてのリクエストの前に走る処理。2 つの役割がある。
//   1. ログイン状態（cookie）の期限を延ばす
//   2. 未ログインの人を /login に案内する
//
// このファイルは Supabase 公式サンプルの書き方に合わせている。
// 途中の順番を変えると「ときどき勝手にログアウトされる」という再現しにくい不具合になるため、
// コメントの警告どおりに扱うこと。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** ログインしていなくても開いてよいパス */
const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value);
        }
      },
    },
  });

  // createServerClient と getClaims() の間に処理を挟まないこと。
  // getClaims() を消すと、利用者がランダムにログアウトされる。
  // また getSession() は cookie を信用するだけなので、サーバー側の判定には使わない。
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!isLoggedIn && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ログイン済みの人がログイン画面を開いたらトップに戻す
  if (isLoggedIn && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // supabaseResponse をそのまま返すこと。別の応答を作って返すと cookie が食い違い、
  // ブラウザとサーバーでログイン状態がずれてしまう。
  return supabaseResponse;
}
