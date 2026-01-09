import { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - Marty",
  description: "Martyの特定商取引法に基づく表記をご確認ください。",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">特定商取引法に基づく表記</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-8">
            最終更新日: 2026年1月4日
          </p>

          <div className="bg-muted p-6 rounded-lg mb-8">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top w-1/3">
                    事業者名
                  </td>
                  <td className="py-3">
                    [事業者名を記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: 株式会社○○○
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    運営責任者
                  </td>
                  <td className="py-3">
                    [代表者名を記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: 代表取締役 山田 太郎
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">所在地</td>
                  <td className="py-3">
                    [所在地を記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: 〒XXX-XXXX 東京都○○区○○ X-X-X ○○ビルXF
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    電話番号
                  </td>
                  <td className="py-3">
                    [電話番号を記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: 03-XXXX-XXXX
                      <br />
                      営業時間: 平日 10:00〜18:00（土日祝日を除く）
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    メールアドレス
                  </td>
                  <td className="py-3">
                    [メールアドレスを記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: support@marty.example.com
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    運営統括責任者
                  </td>
                  <td className="py-3">
                    [運営統括責任者名を記入してください]
                    <br />
                    <span className="text-sm text-muted-foreground">
                      例: 山田 太郎
                    </span>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    販売価格
                  </td>
                  <td className="py-3">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Freeプラン: 無料</li>
                      <li>Proプラン: 月額 2,980円（税込）</li>
                      <li>追加クレジット:
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>500pt: 500円（税込）</li>
                          <li>2,000pt: 1,980円（税込）</li>
                          <li>5,000pt: 4,800円（税込）</li>
                        </ul>
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      ※ 各商品ページに表示された価格が適用されます
                    </p>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    商品代金以外の必要料金
                  </td>
                  <td className="py-3">
                    <ul className="list-disc list-inside space-y-1">
                      <li>インターネット接続料金</li>
                      <li>通信料金（お客様のご契約内容により異なります）</li>
                    </ul>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    支払方法
                  </td>
                  <td className="py-3">
                    <ul className="list-disc list-inside space-y-1">
                      <li>クレジットカード決済（Visa、Mastercard、American Express、JCB等）</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      ※ 決済処理はStripe Inc.により安全に行われます
                    </p>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    支払時期
                  </td>
                  <td className="py-3">
                    <ul className="list-disc list-inside space-y-1">
                      <li>サブスクリプション（Proプラン）: 毎月の更新日</li>
                      <li>追加クレジット購入: 購入時即時</li>
                    </ul>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    サービスの提供時期
                  </td>
                  <td className="py-3">
                    決済完了後、即時利用可能となります。
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    返品・キャンセルについて
                  </td>
                  <td className="py-3">
                    <p className="mb-2">
                      当サービスは、デジタルコンテンツの性質上、原則として返品・返金はお受けできません。
                    </p>
                    <p className="mb-2">
                      <strong>サブスクリプションのキャンセル:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        Proプランは、いつでもキャンセル可能です
                      </li>
                      <li>
                        キャンセル後も、現在の請求期間が終了するまでProプランの機能をご利用いただけます
                      </li>
                      <li>
                        キャンセルした請求期間分の日割り返金は行いません
                      </li>
                    </ul>
                    <p className="mt-2 mb-2">
                      <strong>返金が可能な場合:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>当社の責めに帰すべき事由により、サービスの提供ができなかった場合</li>
                      <li>二重請求など、明らかな請求ミスがあった場合</li>
                    </ul>
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    クーリングオフ
                  </td>
                  <td className="py-3">
                    当サービスは、デジタルコンテンツの性質上、特定商取引法に定めるクーリングオフの対象外です。
                  </td>
                </tr>

                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-semibold align-top">
                    動作環境
                  </td>
                  <td className="py-3">
                    <p className="mb-2">
                      <strong>対応ブラウザ:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Google Chrome（最新版）</li>
                      <li>Mozilla Firefox（最新版）</li>
                      <li>Microsoft Edge（最新版）</li>
                      <li>Safari（最新版）</li>
                    </ul>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ※ JavaScriptを有効にしてご利用ください
                      <br />
                      ※ Cookieを受け入れる設定にしてください
                    </p>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold align-top">
                    引渡し時期
                  </td>
                  <td className="py-3">
                    決済完了後、即時サービスをご利用いただけます。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">免責事項</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                当サービスは、AIによる自動生成コンテンツを提供するものであり、生成されたコンテンツの内容について、当社は一切の責任を負いません。
              </li>
              <li>
                生成されたコンテンツの利用により生じた損害について、当社は責任を負いません。
              </li>
              <li>
                外部サービス（Instagram、X、WordPressなど）との連携に関して、当該外部サービスの仕様変更等により機能が制限される場合があります。
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">お問い合わせ先</h2>
            <p>
              特定商取引法に関するお問い合わせは、当サービスのお問い合わせフォームからご連絡ください。
            </p>
            <p className="mt-4">
              営業時間: 平日 10:00〜18:00（土日祝日を除く）
              <br />
              <span className="text-sm text-muted-foreground">
                ※ お問い合わせには、2営業日以内に返信いたします
              </span>
            </p>
          </section>

          <section className="mb-8">
            <p className="text-sm text-muted-foreground">以上</p>
          </section>
        </div>
      </div>
    </div>
  );
}
