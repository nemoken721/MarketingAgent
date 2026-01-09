import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* ブランド */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold mb-3">Marty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AIマーケティングエージェントで、
              <br />
              ビジネスを次のレベルへ。
            </p>
          </div>

          {/* リンク: サービス */}
          <div>
            <h4 className="text-sm font-semibold mb-3">サービス</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  料金プラン
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-foreground transition-colors">
                  連携サービス
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>

          {/* リンク: 法的情報 */}
          <div>
            <h4 className="text-sm font-semibold mb-3">法的情報</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-foreground transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            &copy; {currentYear} Marty. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
