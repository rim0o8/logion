"use client";

import { Button } from "@/components/ui/button";
import { AVAILABLE_MODELS } from "@/config/llm";
import { Bot, Cpu, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  // プロバイダーごとのモデル数をカウント
  const providerCounts = AVAILABLE_MODELS.reduce((acc, model) => {
    acc[model.provider] = (acc[model.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="container flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-4 text-center">
      <h2 className="text-4xl font-bold tracking-tight mb-4">
        あなたに最適なAIを、必要な分だけ
      </h2>
      <p className="text-muted-foreground mb-8 max-w-[700px]">
        複数のプロバイダから最新のAIモデルを選んで、従量課金で利用できます。
        GPT-4o、Claude、DeepSeekなど、用途に合わせて最適なモデルを選択可能です。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full max-w-[900px]">
        <div className="flex flex-col items-center p-6 border rounded-lg shadow-sm">
          <Sparkles className="h-10 w-10 text-primary mb-3" />
          <h3 className="text-xl font-semibold mb-2">多彩なモデル選択</h3>
          <p className="text-sm text-muted-foreground">
            OpenAI、Anthropic、DeepSeekなど、{Object.keys(providerCounts).length}社の
            AIプロバイダから{AVAILABLE_MODELS.length}種類のモデルを選択できます。
          </p>
        </div>
        <div className="flex flex-col items-center p-6 border rounded-lg shadow-sm">
          <Cpu className="h-10 w-10 text-primary mb-3" />
          <h3 className="text-xl font-semibold mb-2">従量課金制</h3>
          <p className="text-sm text-muted-foreground">
            必要な分だけ支払う柔軟な料金体系。高性能モデルも低コストモデルも、
            用途に合わせて自由に選択できます。
          </p>
        </div>
        <div className="flex flex-col items-center p-6 border rounded-lg shadow-sm">
          <Bot className="h-10 w-10 text-primary mb-3" />
          <h3 className="text-xl font-semibold mb-2">マルチモーダル対応</h3>
          <p className="text-sm text-muted-foreground">
            テキストだけでなく、画像も送信可能。視覚的な情報を含めた
            より豊かなコミュニケーションを実現します。
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/chat">
          <Button size="lg">
            チャットを始める
          </Button>
        </Link>
        <Link href="/about">
          <Button variant="outline" size="lg">
            詳しく見る
          </Button>
        </Link>
      </div>
      
      <div className="mt-16 text-sm text-gray-500 flex gap-4">
        <Link href="/privacy-policy" className="hover:underline">
          プライバシーポリシー
        </Link>
        <Link href="/terms" className="hover:underline">
          利用規約
        </Link>
      </div>
    </main>
  );
} 