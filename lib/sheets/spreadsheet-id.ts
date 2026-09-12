// スプレッドシートの URL から ID を取り出す。
// 利用者は URL をそのまま貼ることが多いが、ID だけを入れても受け付ける。

/** URL の中の ID 部分（/d/ と次の / の間） */
const URL_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/** ID として成立する文字だけで、十分な長さがあるか */
const ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;

export type SpreadsheetIdResult =
  | { ok: true; spreadsheetId: string }
  | { ok: false; error: string };

export function extractSpreadsheetId(input: string): SpreadsheetIdResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: "スプレッドシートの URL を入力してください。" };
  }

  const fromUrl = trimmed.match(URL_PATTERN);
  if (fromUrl) {
    return { ok: true, spreadsheetId: fromUrl[1] };
  }

  if (ID_PATTERN.test(trimmed)) {
    return { ok: true, spreadsheetId: trimmed };
  }

  if (trimmed.startsWith("http")) {
    return {
      ok: false,
      error:
        "スプレッドシートの URL ではないようです。https://docs.google.com/spreadsheets/d/... の形式の URL を貼り付けてください。",
    };
  }

  return {
    ok: false,
    error: "スプレッドシートの URL か ID を入力してください。ID は 20 文字以上の英数字です。",
  };
}
