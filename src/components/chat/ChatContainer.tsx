import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { useEffect, useRef } from "react";
import { DummyBannerAd } from "../ads/DummyBannerAd";
import { WebBannerAd } from "../ads/WebBannerAd";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ModelSelector } from "./ModelSelector";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: MessageContent, model?: string) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading,
  selectedModel = DEFAULT_MODEL,
  onSelectModel,
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

  const handleSendMessage = (content: MessageContent) => {
    onSendMessage(content, selectedModel);
  };

  // 広告表示ロジック
  const { showAd, adUnitId, isDummyAd, rotationInterval } = useBannerAd(selectedModel);

  // メッセージのキーを生成する関数
  const getMessageKey = (message: Message, index: number) => {
    if (typeof message.content === 'string') {
      return `${message.content.slice(0, 10)}-${index}`;
    } else if (Array.isArray(message.content) && message.content.length > 0) {
      const firstItem = message.content[0];
      if (firstItem.type === 'text' && firstItem.text) {
        return `${firstItem.text.slice(0, 10)}-${index}`;
      } else if (firstItem.type === 'image_url') {
        return `image-${index}`;
      }
    }
    return `message-${index}`;
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
              {onSelectModel && (
                <div className="mt-4">
                  <ModelSelector 
                    selectedModel={selectedModel} 
                    onSelectModel={onSelectModel} 
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {messages.map((message, index) => (
                <div key={getMessageKey(message, index)}>
                  <ChatMessage
                    message={message}
                    isLoading={index === messages.length - 1 && isLoading && message.role === 'assistant'}
                  />
                  
                  {/* 設定に基づいて広告を表示 */}
                  {showAd && message.role === 'assistant' && (
                    (index === messages.length - 1 || 
                     (index + 1 < messages.length && messages[index + 1].role === 'user')) ? (
                      <div className="w-full flex justify-center my-3">
                        {isDummyAd ? (
                          <DummyBannerAd
                            className="w-full max-w-3xl"
                            modelId={selectedModel}
                            rotationInterval={rotationInterval}
                          />
                        ) : (
                          <WebBannerAd
                            adUnitId={adUnitId}
                            className="w-full max-w-md h-16"
                          />
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10 dark:border-border">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center gap-2 mb-2">
            {onSelectModel && (
              <ModelSelector 
                selectedModel={selectedModel} 
                onSelectModel={onSelectModel} 
              />
            )}
          </div>
          <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
          <div className="mt-2 text-xs text-center text-muted-foreground">
            AIアシスタントは間違った情報を提供する可能性があります。重要な決断には必ず情報を検証してください。
          </div>
        </div>
      </div>
    </div>
  );
} 