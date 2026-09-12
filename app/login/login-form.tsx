"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null };

type Props = {
  /** ログイン後に戻る先。検証済みの値を page.tsx から受け取る */
  nextPath: string;
};

export function LoginForm({ nextPath }: Props) {
  // useActionState: 送信結果（エラー文）と送信中かどうかを React が管理してくれる仕組み
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="email" className="field-label">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-down-pale px-3 py-2 text-sm text-down">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
