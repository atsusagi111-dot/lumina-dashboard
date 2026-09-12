"use server";

// このファイルは "use server" 付きなので、公開できるのは async 関数だけ。
// 普通の関数（日本語化・パス検証）は lib/auth/ に置いている。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toJapaneseMessage } from "@/lib/auth/error-messages";
import { safeRedirectPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = readText(formData, "email").trim();
  const password = readText(formData, "password");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: toJapaneseMessage(error.code) };
  }

  // ヘッダーに出しているログイン情報を作り直させる。
  // これをしないと、画面移動しても前の表示が残る（レイアウトは再実行されないため）。
  revalidatePath("/", "layout");

  // 元々開こうとしていたページへ戻る。外部サイトへ飛ばされないよう safeRedirectPath で検証する。
  // redirect は例外を投げて処理を終えるため、これ以降は実行されない。
  redirect(safeRedirectPath(readText(formData, "next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
