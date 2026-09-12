import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/app/login/login-form";

// Server Action は本物の Supabase につながるので、テストでは差し替える
vi.mock("@/app/login/actions", () => ({
  signIn: vi.fn(async () => ({ error: null })),
}));

describe("ログインフォーム", () => {
  it("メール欄・パスワード欄・ログインボタンを表示する", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("新規登録の導線は置かない（招待制のため）", () => {
    render(<LoginForm />);

    expect(screen.queryByText(/新規登録/)).not.toBeInTheDocument();
  });
});
