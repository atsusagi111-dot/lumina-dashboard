import { isPublicPath, safeRedirectPath } from "@/lib/auth/paths";

describe("ログイン不要のパス判定", () => {
  it("ログイン画面とその配下は通す", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it("名前が似ているだけの別ページは通さない", () => {
    expect(isPublicPath("/login-preview")).toBe(false);
    expect(isPublicPath("/loginXXX")).toBe(false);
    expect(isPublicPath("/authors")).toBe(false);
  });

  it("通常のページは通さない", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/reports/2026-09")).toBe(false);
  });
});

describe("ログイン後の戻り先の検証", () => {
  it("同じサイト内のパスはそのまま使う", () => {
    expect(safeRedirectPath("/reports/2026-09")).toBe("/reports/2026-09");
  });

  it("外部サイトへ飛ばす指定はトップに置き換える", () => {
    expect(safeRedirectPath("https://example.com")).toBe("/");
    expect(safeRedirectPath("//example.com")).toBe("/");
  });

  it("未指定のときはトップにする", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
  });
});
