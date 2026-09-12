import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// 日本語フォント。CSS 変数 --font-noto-sans-jp として globals.css から参照する
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "LUMINA 売上分析ダッシュボード",
  description: "月次の売上・粗利・リピート率を可視化し、AI が翌月のアクションを提案します。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
