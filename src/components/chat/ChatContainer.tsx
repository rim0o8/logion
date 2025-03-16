import type { Message } from "@/lib/llm/types";
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
    const handleUpdate = () => {
      scrollToBottom();
    };
    
    handleUpdate();
    
    // messagesやisLoadingが変更されたときにスクロールする
    const observer = new MutationObserver(handleUpdate);
    const container = scrollContainerRef.current;
    
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    
    return () => observer.disconnect();
  }, []); // 依存配列を空にする

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* メッセージエリア */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-32 bg-background"
      >
        <div className="max-w-3xl mx-auto pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                AIアシスタント
              </h3>
              <p className="text-muted-foreground max-w-md">
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
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10 dark:border-border">
        <div className="max-w-3xl mx-auto p-4">
          <ChatInput onSubmit={onSendMessage} isLoading={isLoading} />
          <div className="mt-2 text-xs text-center text-muted-foreground">
            AIアシスタントは間違った情報を提供する可能性があります。重要な決断には必ず情報を検証してください。
          </div>
        </div>
      </div>
    </div>
  );
} 