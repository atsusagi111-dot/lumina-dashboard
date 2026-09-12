// Google スプレッドシートを読み込む。
//
// サービスアカウント（プログラム用の Google アカウント）で認証し、
// Sheets の REST API から 1 枚目のシートの A〜H 列を取得する。
//
// google-auth-library だけを使い、googleapis は使わない。
// 必要なのは認証トークンの取得だけで、googleapis は Google の全 API を含む巨大なパッケージのため。

import { JWT } from "google-auth-library";
import { googlePrivateKey, googleServiceAccountEmail } from "@/lib/env";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export type FetchSheetResult =
  | { ok: true; title: string; sheetName: string; values: string[][] }
  | { ok: false; error: string };

async function getAccessToken(): Promise<string> {
  const client = new JWT({
    email: googleServiceAccountEmail(),
    // .env.local には改行が \n という 2 文字で入っているので、本物の改行に戻す
    key: googlePrivateKey().replace(/\\n/g, "\n"),
    scopes: [SCOPE],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google の認証トークンを取得できませんでした。");
  return token;
}

/** Google が返すエラーを、利用者が次に何をすればよいか分かる日本語にする */
function toJapaneseError(status: number, message: string): string {
  if (status === 403 || status === 404) {
    return `スプレッドシートを開けませんでした。次の 2 点を確認してください。\n・URL（ID）が正しいか\n・スプレッドシートの「共有」から ${googleServiceAccountEmail()} を閲覧者として追加したか`;
  }
  if (status === 429) {
    return "Google への問い合わせが多すぎます。1 分ほど待ってから、もう一度お試しください。";
  }
  return `スプレッドシートの読み込みに失敗しました（${status}）。${message}`;
}

export async function fetchSheetValues(spreadsheetId: string): Promise<FetchSheetResult> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return {
      ok: false,
      error:
        "Google の認証に失敗しました。.env.local の GOOGLE_SERVICE_ACCOUNT_EMAIL と GOOGLE_PRIVATE_KEY を確認してください。",
    };
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 1 枚目のシート名を調べる（利用者がシート名を変えていても読めるようにするため）
  const metaResponse = await fetch(`${API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers,
  });
  if (!metaResponse.ok) {
    const body = await metaResponse.json().catch(() => ({}));
    return { ok: false, error: toJapaneseError(metaResponse.status, body?.error?.message ?? "") };
  }

  const meta = await metaResponse.json();
  const sheetName: string | undefined = meta?.sheets?.[0]?.properties?.title;
  if (!sheetName) {
    return { ok: false, error: "スプレッドシートにシートが 1 枚もありません。" };
  }

  // A〜H 列だけを読む。列が 8 つと決まっているため
  const range = encodeURIComponent(`${sheetName}!A1:H`);
  const valuesResponse = await fetch(`${API_BASE}/${spreadsheetId}/values/${range}`, { headers });
  if (!valuesResponse.ok) {
    const body = await valuesResponse.json().catch(() => ({}));
    return { ok: false, error: toJapaneseError(valuesResponse.status, body?.error?.message ?? "") };
  }

  const data = await valuesResponse.json();
  return {
    ok: true,
    title: meta?.properties?.title ?? "",
    sheetName,
    values: (data.values ?? []) as string[][],
  };
}
