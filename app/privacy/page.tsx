import { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー - Marty",
  description: "Martyのプライバシーポリシーをご確認ください。",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-8">
            最終更新日: 2026年1月4日
          </p>

          <section className="mb-8">
            <p>
              Marty（以下「当社」といいます）は、当社が提供するサービス（以下「当サービス」といいます）における、ユーザーについての個人情報を含む利用者情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. 収集する情報</h2>
            <p>当社は、当サービスの提供にあたり、以下の情報を収集します。</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.1. ユーザーから直接提供される情報</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>メールアドレス</li>
              <li>パスワード（暗号化して保存）</li>
              <li>氏名（任意）</li>
              <li>プロフィール情報</li>
              <li>お問い合わせ内容</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.2. 当サービスの利用に伴い自動的に収集される情報</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>IPアドレス</li>
              <li>デバイス情報（OS、ブラウザの種類、バージョンなど）</li>
              <li>アクセス日時</li>
              <li>参照元URL</li>
              <li>Cookie情報</li>
              <li>当サービスの利用履歴（生成したコンテンツ、投稿履歴、クレジット使用履歴など）</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.3. 決済情報</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                クレジットカード情報は、決済代行サービス（Stripe Inc.）により安全に処理され、当社のサーバーには保存されません。
              </li>
              <li>当社は、Stripeから取引ID、決済日時、決済金額などの情報を受け取ります。</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.4. 外部サービス連携情報</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Instagram、X (Twitter)、WordPressなどの外部サービスとの連携時に取得する認証トークン</li>
              <li>連携したアカウントのユーザー名、プロフィール情報</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. 利用目的</h2>
            <p>当社は、収集した情報を以下の目的で利用します。</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>当サービスの提供、維持、保護及び改善のため</li>
              <li>ユーザー認証、本人確認のため</li>
              <li>料金の請求、決済処理のため</li>
              <li>ユーザーからのお問い合わせ対応のため</li>
              <li>利用規約違反、不正利用の調査・対応のため</li>
              <li>当サービスに関する重要なお知らせ、メンテナンス情報の通知のため</li>
              <li>新機能、キャンペーン、アップデート情報の案内のため（オプトアウト可能）</li>
              <li>統計データの作成、分析のため（個人を特定できない形式で処理）</li>
              <li>当サービスのセキュリティ向上、不正アクセス防止のため</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. 第三者への提供</h2>
            <p>
              当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>
                人の生命、身体または財産の保護のために必要がある場合であって、ユーザーの同意を得ることが困難である場合
              </li>
              <li>
                国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. 第三者サービスの利用</h2>
            <p>
              当サービスでは、以下の第三者サービスを利用しており、これらのサービス提供者に情報が送信されます。各サービスのプライバシーポリシーをご確認ください。
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.1. Google Gemini API</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>AIによるコンテンツ生成のため</li>
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google プライバシーポリシー
                </a>
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2. Stripe</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>決済処理のため</li>
              <li>
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Stripe プライバシーポリシー
                </a>
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3. Supabase</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>データベース、認証サービスのため</li>
              <li>
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Supabase プライバシーポリシー
                </a>
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4. Sentry</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>エラー監視、パフォーマンス分析のため</li>
              <li>個人を特定できる情報は自動的にフィルタリングされます</li>
              <li>
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Sentry プライバシーポリシー
                </a>
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.5. Resend</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>トランザクションメール送信のため</li>
              <li>
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Resend プライバシーポリシー
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Cookieの使用</h2>
            <p>
              当サービスでは、ユーザーの利便性向上、サービスの改善、セキュリティ強化のため、Cookieを使用します。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>
                <strong>必須Cookie:</strong>{" "}
                認証、セッション管理など、サービスの基本機能に必要
              </li>
              <li>
                <strong>分析Cookie:</strong>{" "}
                サービスの利用状況を分析し、改善に役立てるため（無効化可能）
              </li>
            </ul>
            <p className="mt-4">
              ブラウザの設定により、Cookieを無効化することができますが、一部の機能が正常に動作しなくなる場合があります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. 情報の安全管理</h2>
            <p>
              当社は、個人情報の漏えい、滅失または毀損の防止その他の個人情報の安全管理のため、以下の措置を講じます。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>SSL/TLS暗号化通信の使用</li>
              <li>パスワードのハッシュ化</li>
              <li>データベースへのアクセス制限（行レベルセキュリティ）</li>
              <li>定期的なセキュリティ監査とアップデート</li>
              <li>従業員への個人情報保護に関する教育</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. ユーザーの権利</h2>
            <p>ユーザーは、当社に対し、以下の権利を有します。</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>開示請求権:</strong>{" "}
                当社が保有するユーザーの個人情報の開示を請求できます
              </li>
              <li>
                <strong>訂正・追加・削除請求権:</strong>{" "}
                個人情報の内容が事実でない場合、訂正、追加または削除を請求できます
              </li>
              <li>
                <strong>利用停止請求権:</strong>{" "}
                個人情報が目的外で利用されている場合、利用の停止を請求できます
              </li>
              <li>
                <strong>退会権:</strong>{" "}
                いつでも当サービスから退会し、アカウントを削除できます
              </li>
            </ul>
            <p className="mt-4">
              これらの権利を行使される場合は、当サービスの設定画面またはお問い合わせフォームからご連絡ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. データの保存期間</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                アカウント情報: アカウント削除まで、または最終ログインから2年間
              </li>
              <li>クレジット使用履歴: 法令に基づき7年間保存</li>
              <li>Webhook ログ: 30日間保存後、自動削除</li>
              <li>Stripe イベントログ: 90日間保存後、自動削除</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. 子供のプライバシー</h2>
            <p>
              当サービスは、13歳未満の子供を対象としておらず、意図的に13歳未満の子供から個人情報を収集することはありません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. プライバシーポリシーの変更</h2>
            <p>
              当社は、本ポリシーを変更することがあります。変更後のプライバシーポリシーは、当サービス上に掲載した時点で効力を生じるものとします。
            </p>
            <p className="mt-4">
              重要な変更がある場合は、サービス内での通知またはメールにてお知らせします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. お問い合わせ</h2>
            <p>
              本ポリシーに関するお問い合わせは、当サービスのお問い合わせフォームからご連絡ください。
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
