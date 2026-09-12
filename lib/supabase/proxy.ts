// すべてのリクエストの前に走る処理。2 つの役割がある。
//   1. ログイン状態（cookie）の期限を延ばす
//   2. 未ログインの人を /login に案内する
//
// このファイルは Supabase 公式サンプルの書き方に合わせている。
// 途中の順番を変えると「ときどき勝手にログアウトされる」という再現しにくい不具合になるため、
// コメントの警告どおりに扱うこと。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/auth/paths";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

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
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // ログイン後に元のページへ戻れるよう、行き先を覚えておく
    url.searchParams.set("next", pathname);
    return redirectKeepingCookies(url, supabaseResponse);
  }

  // ログイン済みの人がログイン画面を開いたらトップに戻す
  if (isLoggedIn && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectKeepingCookies(url, supabaseResponse);
  }

  // supabaseResponse をそのまま返すこと。別の応答を作って返すと cookie が食い違い、
  // ブラウザとサーバーでログイン状態がずれてしまう。
  return supabaseResponse;
}

/**
 * 転送するときも、Supabase が更新したログイン cookie を必ず引き継ぐ。
 * これを忘れると、期限が更新された直後の人が突然ログアウトされる。
 */
function redirectKeepingCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}
