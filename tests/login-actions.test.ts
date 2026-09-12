import { toJapaneseMessage } from "@/lib/auth/error-messages";

describe("ログインエラーの日本語化", () => {
  it("パスワード違いは、どちらが違うかを明かさない文言にする", () => {
    expect(toJapaneseMessage("invalid_credentials")).toBe(
      "メールアドレスまたはパスワードが違います。",
    );
  });

  it("メール未確認は、管理者に連絡するよう案内する", () => {
    expect(toJapaneseMessage("email_not_confirmed")).toContain("管理者");
  });

  it("回数制限は、待つよう案内する", () => {
    expect(toJapaneseMessage("over_request_rate_limit")).toContain("しばらく");
  });

  it("知らないエラーでも、英語のまま出さない", () => {
    expect(toJapaneseMessage("some_new_error_code")).toBe(
      "ログインできませんでした。時間をおいて、もう一度お試しください。",
    );
    expect(toJapaneseMessage(undefined)).toContain("ログインできませんでした");
  });
});
