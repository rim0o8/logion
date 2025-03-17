import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { useEffect, useRef, useState } from "react";
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(0);

  // ビューポートの高さを監視
  useEffect(() => {
    const setInitialHeight = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    setInitialHeight();

    // visualViewportのリサイズイベントを監視（モバイルキーボード対応）
    const handleResize = () => {
      if (window.visualViewport) {
        const newHeight = window.visualViewport.height;
        // キーボードが表示されたかどうかを判定
        const heightDifference = window.innerHeight - newHeight;
        setIsKeyboardVisible(heightDifference > 150); // 150px以上の差があればキーボードが表示されたと判断
        setViewportHeight(newHeight);
      }
    };

    // visualViewportが利用可能な場合はそれを使用
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      // フォールバックとしてwindowのリサイズイベントを使用
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

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
  }, []); // 依存配列を空にする - MutationObserverが変更を検知するため

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
    }
    
    if (Array.isArray(message.content) && message.content.length > 0) {
      const firstItem = message.content[0];
      if (firstItem.type === 'text' && firstItem.text) {
        return `${firstItem.text.slice(0, 10)}-${index}`;
      }
      
      if (firstItem.type === 'image_url') {
        return `image-${index}`;
      }
    }
    
    return `message-${index}`;
  };

  // キーボードが表示されている時のスタイル調整
  const keyboardAdjustStyle = isKeyboardVisible ? {
    paddingBottom: `calc(${viewportHeight * 0.4}px)`,
  } : {};

  return (
    <div className="flex flex-col h-full bg-background">
      {/* メッセージエリア */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-36 sm:pb-32 bg-background"
        style={keyboardAdjustStyle}
      >
        <div className="max-w-3xl mx-auto pt-4 sm:pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-2 sm:px-4 text-center">
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                AIアシスタント
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
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
            <div className="px-2 sm:px-4 space-y-1 sm:space-y-2">
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
                      <div className="w-full flex justify-center my-2 sm:my-3">
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
      <div className={`fixed bottom-0 left-0 right-0 bg-background border-t z-10 dark:border-border ${isKeyboardVisible ? 'keyboard-visible' : ''}`}>
        <div className="max-w-3xl mx-auto px-2 sm:px-4 pb-safe">
          <div className={`flex items-center justify-between gap-2 my-2 ${isKeyboardVisible ? 'hidden' : ''}`}>
            {onSelectModel && (
              <ModelSelector 
                selectedModel={selectedModel} 
                onSelectModel={onSelectModel} 
              />
            )}
          </div>
          <ChatInput 
            onSubmit={handleSendMessage} 
            isLoading={isLoading} 
            modelId={selectedModel} 
          />
          <div className={`mt-1 sm:mt-2 text-xs text-center text-muted-foreground px-2 pb-2 ${isKeyboardVisible ? 'hidden' : ''}`}>
            AIアシスタントは間違った情報を提供する可能性があります。重要な決断には必ず情報を検証してください。
          </div>
        </div>
      </div>
    </div>
  );
} 