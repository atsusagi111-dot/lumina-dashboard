import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "ログイン | LUMINA 売上分析ダッシュボード",
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-xl font-bold text-navy">ログイン</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">
        アカウントは管理者が発行します。お持ちでない場合は担当者にご連絡ください。
      </p>
      <LoginForm />
    </div>
  );
}
