/**
 * Supabase が返す英語のエラーを、利用者に伝わる日本語に置き換える。
 * 「メールアドレスは合っているがパスワードが違う」といった詳細は返さない
 * （どちらが正しいか分かると、総当たり攻撃の手がかりになるため）。
 */
export function toJapaneseMessage(code: string | undefined): string {
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
