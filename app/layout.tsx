import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import { WebVitals } from "@/components/web-vitals";
import { SkipToContent } from "@/components/accessibility/skip-to-content";
import { A11yChecker } from "@/components/accessibility/a11y-checker";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
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
