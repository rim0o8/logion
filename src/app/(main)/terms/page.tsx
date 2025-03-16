import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 | Logion',
  description: 'Logionの利用規約について説明します。',
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-8">利用規約</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. はじめに</h2>
          <p className="text-gray-700">
            本利用規約（以下「本規約」といいます）は、当社が提供するLogion（以下「本サービス」といいます）の利用条件を定めるものです。
            ユーザーの皆様には、本規約に同意いただいた上で、本サービスをご利用いただきます。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. 定義</h2>
          <p className="text-gray-700">
            本規約において使用する用語の定義は、以下の通りとします：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>「当社」とは、Logionの運営者を指します。</li>
            <li>「ユーザー」とは、本サービスを利用する全ての個人または法人を指します。</li>
            <li>「コンテンツ」とは、テキスト、画像、動画、音声、プログラム、その他の情報を指します。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. 利用登録</h2>
          <p className="text-gray-700">
            本サービスの利用を希望する者は、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって利用登録が完了します。
            当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>虚偽の事項を届け出た場合</li>
            <li>本規約に違反したことがある者からの申請である場合</li>
            <li>その他、当社が利用登録を適当でないと判断した場合</li> 
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. アカウント管理</h2>
          <p className="text-gray-700">
            ユーザーは、自己の責任において、本サービスのアカウントを適切に管理するものとします。
            ユーザーは、いかなる場合にも、アカウントを第三者に譲渡または貸与することはできません。
            当社は、ユーザーのアカウントが第三者によって使用されたことによって生じた損害について、当社に故意または重大な過失がある場合を除き、一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. 禁止事項</h2>
          <p className="text-gray-700">
            ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
            <li>当社のサービスの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
            <li>その他、当社が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. 本サービスの提供の停止等</h2>
          <p className="text-gray-700">
            当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
            <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
            <li>コンピュータまたは通信回線等が事故により停止した場合</li>
            <li>その他、当社が本サービスの提供が困難と判断した場合</li>
          </ul>
          <p className="text-gray-700 mt-2">
            当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害について、理由を問わず一切の責任を負わないものとします。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. 著作権</h2>
          <p className="text-gray-700">
            ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報のみ、本サービスを利用して投稿することができるものとします。
            ユーザーが本サービスを利用して投稿した文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。
            当社は、ユーザーが投稿した情報を利用して行う事業活動に対して、著作権法に基づく権利を行使しないことに同意するものとします。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. 保証の否認および免責事項</h2>
          <p className="text-gray-700">
            当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
            当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重過失による場合を除き、一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. サービス内容の変更等</h2>
          <p className="text-gray-700">
            当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. 利用規約の変更</h2>
          <p className="text-gray-700">
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
            変更後の利用規約は、当社ウェブサイトに掲載された時点から効力を生じるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. 通知または連絡</h2>
          <p className="text-gray-700">
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. 準拠法・裁判管轄</h2>
          <p className="text-gray-700">
            本規約の解釈にあたっては、日本法を準拠法とします。
            本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
          </p>
        </section>

        <p className="text-gray-500 mt-8">
          最終更新日: 2025年3月16日
        </p>
      </div>
    </div>
  );
}