"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * Supabase が返す英語のエラーを、利用者に伝わる日本語に置き換える。
 * 「メールアドレスは合っているがパスワードが違う」といった詳細は返さない（総当たり攻撃の手がかりになるため）。
 */
function toJapaneseMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが違います。";
    case "email_not_confirmed":
      return "メールアドレスの確認が済んでいません。管理者に連絡してください。";
    case "over_request_rate_limit":
      return "試行回数が多すぎます。しばらく待ってからやり直してください。";
    default:
      return "ログインできませんでした。時間をおいて、もう一度お試しください。";
  }
}

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: toJapaneseMessage(error.code) };
  }

  // 成功したらトップページへ。redirect は例外を投げて処理を終えるため、これ以降は実行されない。
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
