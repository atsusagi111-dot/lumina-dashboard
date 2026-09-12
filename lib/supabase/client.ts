// ブラウザ（画面側）から Supabase につなぐためのクライアント。
// 使う鍵は公開鍵なので、ブラウザに出ても問題ない。読み書きできる範囲は RLS が守る。
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
