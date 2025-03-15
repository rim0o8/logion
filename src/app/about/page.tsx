"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            このアプリケーションについて
          </h2>
          
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-3">概要</h3>
            <p className="text-muted-foreground mb-4">
              このLLMアプリケーションは、最新の大規模言語モデル技術を活用して、ユーザーとAIの間でインタラクティブな対話を可能にするプラットフォームです。
              OpenAI APIを利用して、自然な会話体験を提供します。
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-3">主な機能</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AIとのリアルタイム対話</li>
              <li>会話履歴の保存と管理</li>
              <li>自然言語による質問応答</li>
              <li>複雑な問題に対する詳細な説明</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-3">技術スタック</h3>
            <p className="text-muted-foreground mb-4">
              このアプリケーションは以下の技術を使用して構築されています：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>フロントエンド: Next.js, React, TailwindCSS</li>
              <li>AI機能: OpenAI API</li>
              <li>認証: NextAuth.js (オプション)</li>
            </ul>
          </section>

          <div className="flex justify-center mt-10">
            <Link href="/">
              <Button variant="outline" className="mr-4">
                ホームに戻る
              </Button>
            </Link>
            <Link href="/chat">
              <Button>
                チャットを始める
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
