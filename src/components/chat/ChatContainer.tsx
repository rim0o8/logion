import type { Message } from "@/lib/llm/types";
import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* メッセージエリア */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-32"
      >
        <div className="max-w-3xl mx-auto pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                AIアシスタント
              </h3>
              <p className="text-gray-600 max-w-md">
                何でもお気軽にお尋ねください。情報提供、問題解決、アイデア出しなどをサポートします。
              </p>
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {messages.map((message, index) => (
                <ChatMessage
                  key={`${message.content.slice(0, 10)}-${index}`}
                  message={message}
                  isLoading={index === messages.length - 1 && isLoading && message.role === 'assistant'}
                />
              ))}
              
              {/* ユーザーメッセージの後にAIの応答待ちアニメーションを表示 */}
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex items-start gap-4 py-4">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-white border shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '200ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-3xl mx-auto p-4">
          <ChatInput onSubmit={onSendMessage} isLoading={isLoading} />
          <div className="mt-2 text-xs text-center text-gray-500">
            AIアシスタントは間違った情報を提供する可能性があります。重要な決断には必ず情報を検証してください。
          </div>
        </div>
      </div>
    </div>
  );
} 