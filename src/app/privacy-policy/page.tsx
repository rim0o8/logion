import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Logion',
  description: 'Logionのプライバシーポリシーについて説明します。',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. はじめに</h2>
          <p className="text-gray-700">
            私（以下「運営者」といいます）は、Logion（以下「本サービス」といいます）の提供にあたり、
            ユーザーの個人情報を尊重し、適切に保護することを重要な責務と考えています。
            本プライバシーポリシーでは、本サービスにおける個人情報の取り扱いについて説明します。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. 収集する情報</h2>
          <p className="text-gray-700">
            本サービスでは、以下の情報を収集することがあります：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>アカウント情報（メールアドレス、パスワード）</li>
            <li>プロフィール情報</li>
            <li>サービス利用履歴</li>
            <li>デバイス情報（IPアドレス、ブラウザの種類など）</li>
            <li>その他サービス提供に必要な情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. 情報の利用目的</h2>
          <p className="text-gray-700">
            収集した情報は、以下の目的で利用します：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>本サービスの提供・維持・改善</li>
            <li>ユーザーサポートの提供</li>
            <li>サービスの利用状況の分析</li>
            <li>不正利用の防止</li>
            <li>新機能や更新情報のお知らせ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. 情報の共有</h2>
          <p className="text-gray-700">
            私は、以下の場合を除き、ユーザーの個人情報を第三者と共有することはありません：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>ユーザーの同意がある場合</li>
            <li>法律上の要請がある場合</li>
            <li>サービス提供に必要なパートナー企業（データ分析サービスなど）との共有</li>
          </ul>
          <p className="text-gray-700 mt-2">
            なお、私は分析目的でデータを閲覧することがありますが、それ以外の目的では使用しません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. アクセス解析ツールの使用</h2>
          <p className="text-gray-700">
            本サービスでは、Googleによるアクセス解析ツール「Google Analytics」を使用しています。
            Google Analyticsはトラフィックデータの収集のためにCookieを使用しています。
            このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
            Cookieを無効にすることで、これらの情報の収集を拒否することができます。
            詳細は<a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">こちら</a>をご覧ください。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. データの保護</h2>
          <p className="text-gray-700">
            私は、ユーザーの個人情報を保護するために適切なセキュリティ対策を講じています。
            ただし、インターネット上での完全なセキュリティを保証することはできません。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. ユーザーの権利</h2>
          <p className="text-gray-700">
            ユーザーは、自身の個人情報に関して以下の権利を有しています：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>個人情報へのアクセス</li>
            <li>個人情報の訂正</li>
            <li>個人情報の削除</li>
            <li>個人情報の処理の制限</li>
            <li>データポータビリティ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. プライバシーポリシーの変更</h2>
          <p className="text-gray-700">
            私は、必要に応じて本プライバシーポリシーを変更することがあります。
            変更があった場合は、本サービス上で通知します。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. お問い合わせ</h2>
          <p className="text-gray-700">
            本プライバシーポリシーに関するお問い合わせは、以下の連絡先までお願いします：
          </p>
          <p className="text-gray-700 mt-2">
            メールアドレス: support@logion.example.com
          </p>
        </section>

        <p className="text-gray-500 mt-8">
          最終更新日: 2023年3月16日
        </p>
      </div>
    </div>
  );
} 