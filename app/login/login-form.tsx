"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null };

type Props = {
  /** ログイン後に戻る先。proxy.ts が ?next= に入れてくれる */
  nextPath?: string;
};

export function LoginForm({ nextPath = "/" }: Props) {
  // useActionState: 送信結果（エラー文）と送信中かどうかを React が管理してくれる仕組み
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-navy-pale px-3 py-2 text-ink outline-none focus:border-navy-light focus:ring-2 focus:ring-navy-pale"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-navy-pale px-3 py-2 text-ink outline-none focus:border-navy-light focus:ring-2 focus:ring-navy-pale"
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
        className="w-full rounded-md bg-navy px-4 py-2 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
      >
        {isPending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
