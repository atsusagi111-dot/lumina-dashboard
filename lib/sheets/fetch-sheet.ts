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

/** Google が応答しないときに、いつまでも「取り込み中…」にならないようにする */
const TIMEOUT_MS = 15_000;

export type FetchSheetResult =
  | { ok: true; title: string; sheetName: string; values: string[][] }
  | { ok: false; error: string };

async function getAccessToken(): Promise<string> {
  const client = new JWT({
    email: googleServiceAccountEmail(),
    key: googlePrivateKey(),
    scopes: [SCOPE],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google の認証トークンを取得できませんでした。");
  return token;
}

/** Google が返すエラーを、利用者が次に何をすればよいか分かる日本語にする */
function toJapaneseError(status: number): string {
  if (status === 403 || status === 404) {
    return `スプレッドシートを開けませんでした。次の 2 点を確認してください。\n・URL（ID）が正しいか\n・スプレッドシートの「共有」から ${googleServiceAccountEmail()} を閲覧者として追加したか`;
  }
  if (status === 429) {
    return "Google への問い合わせが多すぎます。1 分ほど待ってから、もう一度お試しください。";
  }
  return `スプレッドシートの読み込みに失敗しました（エラーコード ${status}）。時間をおいて、もう一度お試しください。`;
}

/**
 * シート名を A1 表記（`'シート名'!A1:H` の形）にする。
 *
 * 名前に空白や記号が入る場合（例：「売上 2025」）は単引用符で囲まないと Google が解釈できない。
 * 名前の中の ' は '' と 2 つ重ねるのが A1 表記の決まり。
 */
function toA1Range(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!A1:H`;
}

type JsonResponse = { response: Response; body: Record<string, unknown> };

async function getJson(url: string, token: string): Promise<JsonResponse> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body: body as Record<string, unknown> };
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

  try {
    // 1 枚目のシート名を調べる（利用者がシート名を変えていても読めるようにするため）
    const meta = await getJson(
      `${API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
      token,
    );
    if (!meta.response.ok) {
      return { ok: false, error: toJapaneseError(meta.response.status) };
    }

    const sheets = meta.body.sheets as { properties?: { title?: string } }[] | undefined;
    const sheetName = sheets?.[0]?.properties?.title;
    if (!sheetName) {
      return { ok: false, error: "スプレッドシートにシートが 1 枚もありません。" };
    }

    // A〜H 列だけを読む。列が 8 つと決まっているため
    const values = await getJson(
      `${API_BASE}/${spreadsheetId}/values/${encodeURIComponent(toA1Range(sheetName))}`,
      token,
    );
    if (!values.response.ok) {
      return { ok: false, error: toJapaneseError(values.response.status) };
    }

    const title = (meta.body.properties as { title?: string } | undefined)?.title ?? "";
    return {
      ok: true,
      title,
      sheetName,
      values: (values.body.values ?? []) as string[][],
    };
  } catch {
    // 通信断・タイムアウト・Google 側の不調など
    return {
      ok: false,
      error: "Google への接続に失敗しました。通信環境を確認して、もう一度お試しください。",
    };
  }
}
