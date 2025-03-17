'use client';

import { DEFAULT_MODEL } from "@/config/llm";
import { useInterstitialAd } from '@/lib/ads/webAdManager';
import type { Message } from "@/lib/llm/types";
import { generateConversationId } from "@/lib/storage";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 実際のチャットコンポーネント
export default function NewChatPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const { loaded, showInterstitial, isVisible, closeInterstitial, isDummyAd, modelId } = useInterstitialAd(selectedModel);

  // 初回レンダリング時に新しい会話IDを生成してリダイレクト
  useEffect(() => {
    // 新しい会話IDを生成
    const newConversationId = generateConversationId();
    
    // 新しい会話ページにリダイレクト（保存せずに直接リダイレクト）
    router.push(`/chat/${newConversationId}`);
  }, [router]);

  // このページでは実際のチャット機能は使用せず、リダイレクトのみを行う
  return (
    <main className="flex-1 flex flex-col h-full bg-background">
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    </main>
  );
}
