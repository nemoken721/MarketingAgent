import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { WebVitals } from "@/components/web-vitals";
import { SkipToContent } from "@/components/accessibility/skip-to-content";
import { A11yChecker } from "@/components/accessibility/a11y-checker";
import { Providers } from "@/components/providers";
import { LiffLayoutWrapper } from "@/components/layout/liff-layout-wrapper";

const inter = Inter({ subsets: ["latin"] });

// Design System v2.0: Typography
// Noto Sans JP (ゴシック体) - 400, 500, 700
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

// Noto Serif JP (明朝体) - for Frame 2 Magazine style
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marty - AI Marketing Partner",
  description: "自律型AIマーケティングパートナー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} ${notoSansJP.variable} ${notoSerifJP.variable}`}>
        <Providers>
          <SkipToContent />
          <WebVitals />
          <A11yChecker />
          <LiffLayoutWrapper>{children}</LiffLayoutWrapper>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
