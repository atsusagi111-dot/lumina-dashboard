// 環境変数（.env.local に書く設定値）を読むための共通処理。
//
// なぜ専用ファイルを作るか：値が入っていないとき、英語の分かりにくい例外ではなく
// 「何を・どこに書けばよいか」を日本語で伝えるため。
//
// 注意：NEXT_PUBLIC_ で始まる変数は process.env.NEXT_PUBLIC_XXX と
// そのままの形で書かないと Next.js がブラウザ向けに埋め込めない。
// そのため変数名を組み立てる書き方はしていない。

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。プロジェクト直下の .env.local に ${name}=... を追加して、開発サーバーを再起動してください。設定する値は .env.example のコメントを参照してください。`,
    );
  }
  return value;
}

/** Supabase プロジェクトの URL（例：https://xxxx.supabase.co） */
export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** ブラウザに出してよい公開鍵（sb_publishable_... 旧 anon key） */
export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Google サービスアカウントのメールアドレス（スプレッドシートの共有先） */
export function googleServiceAccountEmail(): string {
  return required("GOOGLE_SERVICE_ACCOUNT_EMAIL", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
}

/** Google サービスアカウントの秘密鍵。改行は \n の 2 文字で入っているので、使う側で戻す */
export function googlePrivateKey(): string {
  return required("GOOGLE_PRIVATE_KEY", process.env.GOOGLE_PRIVATE_KEY);
}
