import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://playcastr.net"),
  title: "PlayCastr — 穴場ゲームを見つけよう",
  description: "視聴者数・配信チャンネル数・伸びを分析し、今狙うべき穴場ゲームを可視化するストリーマー向けダッシュボード。",
  icons: { icon: "/icon.png" },
  openGraph: {
    title: "PlayCastr — 穴場ゲームを見つけよう",
    description: "視聴者数・配信チャンネル数・伸びを分析し、今狙うべき穴場ゲームを可視化するストリーマー向けダッシュボード。",
    url: "https://playcastr.net",
    siteName: "PlayCastr",
    images: [{ url: "/ogp.png", width: 1200, height: 630, alt: "PlayCastr" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayCastr — 穴場ゲームを見つけよう",
    description: "視聴者数・配信チャンネル数・伸びを分析し、今狙うべき穴場ゲームを可視化するストリーマー向けダッシュボード。",
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
