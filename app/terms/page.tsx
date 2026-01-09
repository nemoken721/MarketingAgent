import { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 - Marty",
  description: "Martyの利用規約をご確認ください。",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">利用規約</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-8">
            最終更新日: 2026年1月4日
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第1条（適用）</h2>
            <p>
              本利用規約（以下「本規約」といいます）は、Marty（以下「当サービス」といいます）の利用に関する条件を、当サービスを利用するお客様（以下「ユーザー」といいます）と当社との間で定めるものです。
            </p>
            <p>
              ユーザーは、本規約に同意した上で、当サービスを利用するものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第2条（定義）</h2>
            <p>本規約において使用する用語の定義は、以下のとおりとします。</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                「当サービス」とは、当社が提供する「Marty」という名称のAIマーケティングエージェントサービスを意味します。
              </li>
              <li>
                「ユーザー」とは、本規約に同意の上、当サービスに登録し、これを利用する個人または法人を意味します。
              </li>
              <li>
                「ポイント」とは、当サービス内で利用できる仮想通貨を意味します。
              </li>
              <li>
                「コンテンツ」とは、文章、画像、動画その他の情報を意味します。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第3条（登録）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当サービスの利用を希望する者は、本規約を遵守することに同意し、かつ当社の定める一定の情報（以下「登録情報」といいます）を当社の定める方法で当社に提供することにより、当社に対し、当サービスの利用の登録を申請することができます。
              </li>
              <li>
                当社は、当社の基準に従って、登録申請者の登録の可否を判断し、当社が登録を認める場合にはその旨を登録申請者に通知します。登録申請者のユーザーとしての登録は、当社が本項の通知を行ったことをもって完了したものとします。
              </li>
              <li>
                当社は、登録申請者が以下の各号のいずれかの事由に該当する場合は、登録及び再登録を拒否することがあります。
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>登録情報に虚偽、誤記または記載漏れがあった場合</li>
                  <li>過去に利用停止等の措置を受けたことがある場合</li>
                  <li>その他、当社が登録を適当でないと判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第4条（アカウント管理）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                ユーザーは、自己の責任において、当サービスのアカウント情報を適切に管理及び保管するものとし、これを第三者に利用させ、または貸与、譲渡、名義変更、売買等をしてはならないものとします。
              </li>
              <li>
                アカウント情報の管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任はユーザーが負うものとします。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第5条（料金及び支払方法）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                ユーザーは、当サービスの有料プランを利用する場合、当社が別途定める利用料金を、当社が指定する支払方法により支払うものとします。
              </li>
              <li>
                ユーザーが利用料金の支払を遅滞した場合、ユーザーは年14.6%の割合による遅延損害金を当社に支払うものとします。
              </li>
              <li>
                一度お支払いいただいた利用料金は、理由の如何を問わず返金いたしません。ただし、当社の責めに帰すべき事由による場合はこの限りではありません。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第6条（禁止事項）</h2>
            <p>
              ユーザーは、当サービスの利用にあたり、以下の各号のいずれかに該当する行為または該当すると当社が判断する行為をしてはなりません。
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>法令に違反する行為または犯罪行為に関連する行為</li>
              <li>公序良俗に反する行為</li>
              <li>当社、当サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシーの権利、名誉、その他の権利または利益を侵害する行為</li>
              <li>暴力的または残虐な表現、性的表現、差別表現を含むコンテンツを生成または投稿する行為</li>
              <li>当サービスのネットワークまたはシステム等に過度な負荷をかける行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>不正アクセス行為またはこれを試みる行為</li>
              <li>逆アセンブル、逆コンパイル、リバースエンジニアリング等の行為</li>
              <li>当サービスを商業目的で使用する行為（当社が事前に承認した場合を除く）</li>
              <li>他のユーザーのアカウント情報を収集する行為</li>
              <li>反社会的勢力等への利益供与</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第7条（コンテンツの権利帰属）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当サービスを通じてユーザーが生成したコンテンツの著作権は、当該ユーザーに帰属します。
              </li>
              <li>
                ユーザーは、当社に対し、生成したコンテンツを、当サービスの提供、改善、プロモーション等の目的で、無償で使用する権利を許諾するものとします。
              </li>
              <li>
                当サービスに関する一切の知的財産権は当社または当社にライセンスを許諾している者に帰属します。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第8条（サービスの停止・中断）</h2>
            <p>
              当社は、以下のいずれかに該当する場合には、ユーザーに事前に通知することなく、当サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>当サービスに係るコンピューター・システムの点検または保守作業を緊急に行う場合</li>
              <li>コンピューター、通信回線等の障害、誤操作、過度なアクセスの集中、不正アクセス、ハッキング等により当サービスの運営ができなくなった場合</li>
              <li>地震、落雷、火災、風水害、停電、天災地変などの不可抗力により当サービスの運営ができなくなった場合</li>
              <li>その他、当社が停止または中断を必要と判断した場合</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第9条（利用制限及び登録抹消）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当社は、ユーザーが以下の各号のいずれかの事由に該当する場合は、事前に通知または催告することなく、当該ユーザーについて当サービスの利用を一時的に停止し、またはユーザーとしての登録を抹消することができます。
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>本規約のいずれかの条項に違反した場合</li>
                  <li>登録情報に虚偽の事実があることが判明した場合</li>
                  <li>支払停止もしくは支払不能となり、または破産手続開始、民事再生手続開始、会社更生手続開始、特別清算開始若しくはこれらに類する手続の開始の申立てがあった場合</li>
                  <li>6ヶ月以上当サービスの利用がない場合</li>
                  <li>その他、当社が当サービスの利用を適当でないと判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第10条（退会）</h2>
            <p>
              ユーザーは、当社所定の手続の完了により、当サービスから退会し、自己のユーザーとしての登録を抹消することができます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第11条（免責事項）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当社は、当サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）がないことを保証するものではありません。
              </li>
              <li>
                当社は、当サービスに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。ただし、当社の故意または重過失によるものである場合はこの限りではありません。
              </li>
              <li>
                当サービスを通じて生成されたコンテンツの内容について、当社は一切の責任を負いません。ユーザーは、自己の責任において、生成されたコンテンツの内容を確認し、使用するものとします。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第12条（サービス内容の変更、終了）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当社は、ユーザーに通知することなく、当サービスの内容を変更、または提供を終了することができます。
              </li>
              <li>
                当社が当サービスの提供を終了する場合、当社はユーザーに事前に通知するものとします。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第13条（利用規約の変更）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                当社は、当社が必要と認めた場合は、本規約を変更できるものとします。
              </li>
              <li>
                当社は、本規約を変更した場合は、ユーザーに当該変更内容を通知するものとし、当該変更内容の通知後、ユーザーが当サービスを利用した場合または当社の定める期間内に退会の手続をとらなかった場合には、ユーザーは、本規約の変更に同意したものとみなします。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第14条（個人情報の取扱い）</h2>
            <p>
              当社による個人情報の取扱いについては、別途当社プライバシーポリシーの定めによるものとし、ユーザーはこのプライバシーポリシーに従って当社がユーザーの個人情報を取扱うことについて同意するものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第15条（通知または連絡）</h2>
            <p>
              ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第16条（権利義務の譲渡禁止）</h2>
            <p>
              ユーザーは、当社の書面による事前の承諾なく、本規約上の地位または本規約に基づく権利もしくは義務につき、第三者に対し、譲渡、移転、担保設定、その他の処分をすることはできません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第17条（準拠法及び管轄裁判所）</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                本規約の準拠法は日本法とします。
              </li>
              <li>
                本規約に起因し、または関連する一切の紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <p className="text-sm text-muted-foreground">以上</p>
          </section>
        </div>
      </div>
    </div>
  );
}
