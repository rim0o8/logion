import type { Message, MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { DummyBannerAd } from "../ads/DummyBannerAd";
import { WebBannerAd } from "../ads/WebBannerAd";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import { useAutoScroll } from "./hooks/useAutoScroll";

interface ChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  showAd: boolean;
  isDummyAd: boolean;
  adUnitId: string;
  rotationInterval: number;
  selectedModel: string;
  onSendMessage: (content: MessageContent) => void;
  openSidebar: () => void;
  keyboardAdjustStyle: CSSProperties;
}

export function ChatMessageList({
  messages,
  isLoading,
  showAd,
  isDummyAd,
  adUnitId,
  rotationInterval,
  selectedModel,
  onSendMessage,
  openSidebar,
  keyboardAdjustStyle
}: ChatMessageListProps) {
  const { messagesEndRef, scrollContainerRef } = useAutoScroll();

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

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto pb-40 sm:pb-40 bg-background"
      style={keyboardAdjustStyle}
    >
      <div className="max-w-3xl mx-auto pt-4 sm:pt-6">
        {messages.length === 0 ? (
          <ChatEmptyState onSendMessage={onSendMessage} openSidebar={openSidebar} />
        ) : (
          <div className="px-4 sm:px-6 space-y-4 sm:space-y-6 pb-6">
            {messages.map((message, index) => (
              <motion.div 
                key={getMessageKey(message, index)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* メッセージ表示 */}
                <ChatMessage
                  message={message}
                  isLoading={index === messages.length - 1 && isLoading && message.role === 'assistant'}
                />
                
                {/* 設定に基づいて広告を表示 */}
                {showAd && message.role === 'assistant' && (
                  (index === messages.length - 1 || 
                   (index + 1 < messages.length && messages[index + 1].role === 'user')) ? (
                    <div className="w-full flex justify-center my-2 sm:my-3 opacity-95">
                      {isDummyAd ? (
                        <DummyBannerAd
                          className="w-full max-w-3xl rounded-lg overflow-hidden shadow-sm"
                          modelId={selectedModel}
                          rotationInterval={rotationInterval}
                        />
                      ) : (
                        <WebBannerAd
                          adUnitId={adUnitId}
                          className="w-full max-w-md h-16 rounded-lg overflow-hidden shadow-sm"
                        />
                      )}
                    </div>
                  ) : null
                )}
              </motion.div>
            ))}
            {/* スクロール位置調整用の余白 - 入力エリアとの相性を改善 */}
            <div ref={messagesEndRef} className="h-12" />
          </div>
        )}
      </div>
    </div>
  );
} 