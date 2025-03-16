"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-4 text-center">
      <h2 className="text-4xl font-bold tracking-tight mb-4">
        AIとの対話を始めましょう
      </h2>
      <p className="text-muted-foreground mb-8 max-w-[600px]">
        このアプリケーションでは、最新のAI技術を活用して、
        あなたの質問や課題に対して適切なアドバイスを提供します。
      </p>
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
    </main>
  );
} 