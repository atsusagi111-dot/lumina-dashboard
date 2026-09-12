import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * ログイン中の人を取得する。未ログインならログイン画面へ送る。
 *
 * データを扱うページや Server Action の先頭で必ず呼ぶこと。
 * proxy.ts も未ログインを弾いているが、あれは「最初のふるい」であって唯一の守りにしてはいけない
 * （Next.js 公式ガイドの指針）。実際にデータを読む場所の近くで、もう一度確かめる。
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect("/login");
  }

  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}

/** ログイン中なら情報を返し、未ログインなら null を返す（転送はしない） */
export async function getOptionalUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) return null;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
