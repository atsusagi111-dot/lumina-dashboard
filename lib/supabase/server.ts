// サーバー側（Server Component / Server Action）から Supabase につなぐためのクライアント。
// ログイン状態は cookie に入っているので、cookie の読み書きを Supabase に渡している。
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
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
}
