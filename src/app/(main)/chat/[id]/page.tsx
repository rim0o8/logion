'use client';

import { DummyInterstitialAd } from "@/components/ads/DummyInterstitialAd";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { DEFAULT_MODEL } from "@/config/llm";
import { useInterstitialAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import type { Conversation } from "@/lib/storage";
import { generateTitle, getConversation, saveConversation } from "@/lib/storage";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { data: session } = useSession();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isConversationSaved, setIsConversationSaved] = useState(false);
  const { loaded, showInterstitial, isVisible, closeInterstitial, isDummyAd, modelId } = useInterstitialAd(selectedModel);

  // 会話データを読み込み
  useEffect(() => {
    const loadConversation = () => {
      const conv = getConversation(conversationId);
      if (conv) {
        setConversation(conv);
        setMessages(conv.messages);
        setIsConversationSaved(true);
        // 保存されているモデルがあれば、それを使用
        if (conv.model) {
          setSelectedModel(conv.model);
        }
      }
      // 会話が見つからない場合は新規作成（保存はしない）
      setIsInitialLoading(false);
    };

    loadConversation();
  }, [conversationId]);

  // メッセージが更新されたら会話を保存（AIからの応答がある場合のみ）
  useEffect(() => {
    // メッセージがない場合は保存しない
    if (messages.length === 0) return;
    
    // AIからの応答がある場合のみ保存
    const hasAssistantMessage = messages.some(msg => msg.role === 'assistant');
    if (!hasAssistantMessage) return;
    
    // 会話を保存
    if (conversation) {
      // 既存の会話を更新
      const updatedConversation: Conversation = {
        ...conversation,
        messages,
        model: selectedModel,
        updatedAt: new Date().toISOString()
      };
      saveConversation(updatedConversation);
    } else {
      // 新しい会話を作成
      const title = generateTitle(messages);
      const newConversation: Conversation = {
        id: conversationId,
        title,
        messages,
        model: selectedModel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveConversation(newConversation);
      setConversation(newConversation);
      setIsConversationSaved(true);
    }
  }, [messages, conversation, selectedModel, conversationId]);

  const handleSendMessage = async (content: MessageContent, model?: string) => {
    try {
      setIsLoading(true);
      const modelToUse = model || selectedModel;

      // ユーザーメッセージを追加
      const userMessage: Message = {
        role: 'user',
        content,
      };
      setMessages(prev => [...prev, userMessage]);

      // 初期の空のアシスタントメッセージを追加（ストリーミング用）
      setStreamingContent("");
      
      // APIリクエスト（ストリーミングモード）
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          stream: true,
          model: modelToUse, // モデルを指定
          conversationId: conversationId, // 会話IDを追加
          userId: session?.user?.email || 'anonymous',
          userEmail: session?.user?.email || session?.email || 'anonymous',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('APIレスポンスエラー:', response.status, errorData);
        throw new Error(`APIエラー: ${response.status} ${errorData.error || ''}`);
      }

      if (!response.body) {
        throw new Error('レスポンスボディがありません');
      }

      // ストリームの読み取り
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        try {
          // デコードしてJSONを解析
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.type === 'chunk') {
                // ストリーミングコンテンツを更新
                setStreamingContent(data.content);
              } else if (data.type === 'done') {
                // 完了したメッセージを追加
                setMessages(prev => [...prev, data.message]);
                setStreamingContent(null);
              }
            } catch (e) {
              console.error('JSONの解析に失敗しました:', line, e);
            }
          }
        } catch (error) {
          console.error('チャンクの処理中にエラーが発生しました:', error);
          // チャンク処理エラー時もストリーミングをリセット
          setStreamingContent(null);
        }
      }

      // 会話が完了したらインタースティシャル広告を表示する可能性
      if (loaded) {
        showInterstitial();
      }

    } catch (error) {
      console.error('エラー:', error);
      alert(`メッセージの送信に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // モデルを変更する関数
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  // 表示用のメッセージ配列を作成（通常のメッセージ + ストリーミング中のメッセージ）
  const displayMessages = [...messages];
  if (streamingContent !== null) {
    displayMessages.push({
      role: 'assistant',
      content: streamingContent
    });
  }

  if (isInitialLoading) {
    return (
      <main className="flex-1 flex flex-col h-full bg-background">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-background">
      <ChatContainer
        messages={displayMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModel={selectedModel}
        onSelectModel={handleModelChange}
      />
      
      {/* インタースティシャル広告 */}
      {isVisible && isDummyAd && (
        <DummyInterstitialAd 
          onClose={closeInterstitial}
          modelId={modelId}
        />
      )}
    </main>
  );
} 