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
      className="flex-1 overflow-y-auto pb-36 sm:pb-32 bg-background"
      style={keyboardAdjustStyle}
    >
      <div className="max-w-3xl mx-auto pt-4 sm:pt-6">
        {messages.length === 0 ? (
          <ChatEmptyState onSendMessage={onSendMessage} openSidebar={openSidebar} />
        ) : (
          <div className="px-3 sm:px-4 space-y-1 sm:space-y-2 pb-2">
            {messages.map((message, index) => (
              <motion.div 
                key={getMessageKey(message, index)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
                          className="w-full max-w-3xl rounded-lg overflow-hidden"
                          modelId={selectedModel}
                          rotationInterval={rotationInterval}
                        />
                      ) : (
                        <WebBannerAd
                          adUnitId={adUnitId}
                          className="w-full max-w-md h-16 rounded-lg overflow-hidden"
                        />
                      )}
                    </div>
                  ) : null
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
} 