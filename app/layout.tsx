import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import { WebVitals } from "@/components/web-vitals";
import { SkipToContent } from "@/components/accessibility/skip-to-content";
import { A11yChecker } from "@/components/accessibility/a11y-checker";

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
        <SkipToContent />
        <WebVitals />
        <A11yChecker />
        <div className="flex flex-col min-h-screen">
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
