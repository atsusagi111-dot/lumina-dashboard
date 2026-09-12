import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/app/login/login-form";

// Server Action は本物の Supabase につながるので、テストでは差し替える
const signIn = vi.hoisted(() => vi.fn(async () => ({ error: null as string | null })));
vi.mock("@/app/login/actions", () => ({ signIn }));

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

  it("ログイン後の戻り先を hidden で持つ", () => {
    const { container } = render(<LoginForm nextPath="/reports/2026-09" />);

    const hidden = container.querySelector('input[name="next"]');
    expect(hidden).toHaveValue("/reports/2026-09");
  });
});
