"use client";

import { useActionState } from "react";
import { importSpreadsheet } from "./actions";
import { INITIAL_IMPORT_STATE } from "@/lib/sheets/import-state";

type Props = {
  /** スプレッドシートを共有してもらう先のメールアドレス */
  serviceAccountEmail: string;
};

export function ImportForm({ serviceAccountEmail }: Props) {
  const [state, formAction, isPending] = useActionState(importSpreadsheet, INITIAL_IMPORT_STATE);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="spreadsheetUrl" className="block text-sm font-medium text-ink">
            スプレッドシートの URL
          </label>
          <input
            id="spreadsheetUrl"
            name="spreadsheetUrl"
            type="text"
            required
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="mt-1 w-full rounded-md border border-navy-pale px-3 py-2 text-ink outline-none focus:border-navy-light focus:ring-2 focus:ring-navy-pale"
          />
          <p className="mt-2 text-xs text-ink-muted">
            事前に、そのスプレッドシートを <span className="font-medium">{serviceAccountEmail}</span>{" "}
            に「閲覧者」として共有してください。
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-2 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
        >
          {isPending ? "取り込み中…" : "取り込む"}
        </button>
      </form>

      {state.status === "success" && (
        <p role="status" className="rounded-md bg-navy-pale px-3 py-2 text-sm text-navy">
          {state.message}
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className="rounded-md bg-down-pale px-3 py-3 text-sm text-down">
          <p className="whitespace-pre-line font-medium">{state.message}</p>
          {state.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
