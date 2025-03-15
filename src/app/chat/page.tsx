'use client';

import { ChatContainer } from "@/components/chat/ChatContainer";
import type { Message } from "@/lib/llm/types";
import type { Conversation } from "@/lib/storage";
import { generateConversationId, generateTitle, saveConversation } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);

  const handleSendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // ユーザーメッセージを追加
      const userMessage: Message = {
        role: 'user',
        content,
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // 初期の空のアシスタントメッセージを追加（ストリーミング用）
      setStreamingContent("");
      
      // APIリクエスト（ストリーミングモード）
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('APIエラーが発生しました');
      }

      if (!response.body) {
        throw new Error('レスポンスボディがありません');
      }

      // ストリームの読み取り
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // デコードしてJSONを解析
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'chunk') {
              // ストリーミングコンテンツを更新
              setStreamingContent(data.content);
              finalContent = data.content;
            } else if (data.type === 'done') {
              // 完了したメッセージを追加
              const assistantMessage = data.message;
              finalContent = assistantMessage.content;
              
              setMessages(prev => [...prev, assistantMessage]);
              setStreamingContent(null);
            }
          } catch (e) {
            console.error('JSONの解析に失敗しました:', line, e);
          }
        }
      }

      // 初回メッセージの場合、新しい会話を作成して保存
      if (messages.length === 0) {
        const newConversationId = generateConversationId();
        const title = generateTitle(updatedMessages);
        
        const newConversation: Conversation = {
          id: newConversationId,
          title,
          messages: [...updatedMessages, { role: 'assistant', content: finalContent }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        saveConversation(newConversation);
        
        // 新しい会話ページにリダイレクト
        router.push(`/chat/${newConversationId}`);
      }

    } catch (error) {
      console.error('エラー:', error);
      alert('メッセージの送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 表示用のメッセージ配列を作成（通常のメッセージ + ストリーミング中のメッセージ）
  const displayMessages = [...messages];
  if (streamingContent !== null) {
    displayMessages.push({
      role: 'assistant',
      content: streamingContent
    });
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-white">
      <ChatContainer
        messages={displayMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </main>
  );
} 