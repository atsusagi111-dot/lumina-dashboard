// サーバー側（Server Component / Server Action）から Supabase につなぐためのクライアント。
// ログイン状態は cookie に入っているので、cookie の読み書きを Supabase に渡している。
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// cache で包む理由：1 回の画面表示の中で何度呼んでも、クライアントは 1 つで済む。
// cookies() はリクエストごとに別物なので、他のリクエストと混ざることはない。
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // 第 2 引数の headers は受け取っていない（Server Action は POST なのでキャッシュ制御が不要なため）
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component から呼ばれた場合、cookie は書き込めない仕様。
          // ログイン状態の更新は proxy.ts が行うので、ここは無視してよい。
        }
      },
    },
  });
});
