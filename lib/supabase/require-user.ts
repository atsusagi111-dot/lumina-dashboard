import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  userId: string;
  email: string | null;
};

/**
 * ログイン中の人を取得する。未ログインなら null。
 *
 * cache() で包む理由：1 回の画面表示の中で何度呼んでも、Supabase への問い合わせは 1 回で済む。
 * ヘッダーとページ本文の両方から呼んでも、往復が増えない。
 */
const readUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) return null;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

/** ログイン中なら情報を返し、未ログインなら null を返す（転送はしない） */
export async function getOptionalUser(): Promise<CurrentUser | null> {
  return readUser();
}

/**
 * ログイン中の人を返す。未ログインならログイン画面へ送る。
 *
 * データを扱うページや Server Action の先頭で必ず呼ぶこと。
 * proxy.ts も未ログインを弾いているが、あれは「最初のふるい」であって唯一の守りにしてはいけない
 * （Next.js 公式ガイドの指針）。実際にデータを読む場所の近くで、もう一度確かめる。
 */
export async function requireUser(): Promise<CurrentUser & { supabase: SupabaseClient<Database> }> {
  const user = await readUser();
  if (!user) redirect("/login");
  // データを読み書きするページから使えるよう、クライアントも一緒に返す
  return { ...user, supabase: await createClient() };
}
