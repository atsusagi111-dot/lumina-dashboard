import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md border border-navy-light px-3 py-1 text-xs text-white transition hover:bg-navy-light"
      >
        ログアウト
      </button>
    </form>
  );
}
