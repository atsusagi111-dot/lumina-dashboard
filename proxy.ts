// Next.js 16 の proxy（旧 middleware）。全ページの表示前に走る入口。
// 中身は lib/supabase/proxy.ts に置いている。
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 画像や静的ファイルには走らせない（無駄な処理を避けるため）
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
