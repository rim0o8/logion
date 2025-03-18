import type { Message, MessageContent } from "@/lib/llm/types";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, RefObject } from "react";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import { MessageAd } from "./MessageAd";

/**
 * チャットメッセージリストのProps
 */
interface ChatMessageListProps {
  // メッセージ関連
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (content: MessageContent) => void;
  
  // 表示設定
  keyboardAdjustStyle?: CSSProperties;
  
  // 広告表示設定
  showAd?: boolean;
  isDummyAd?: boolean;
  adUnitId?: string;
  rotationInterval?: number;
  selectedModel?: string;
  
  // スクロール関連
  messagesEndRef?: RefObject<HTMLDivElement>;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

// メッセージアニメーションの設定
const messageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 }
};

/**
 * チャットメッセージリストコンポーネント
 * メッセージの表示とスクロール管理を担当
 */
export function ChatMessageList({
  // メッセージ関連
  messages,
  isLoading,
  onSendMessage,
  
  // 表示設定
  keyboardAdjustStyle = {},
  
  // 広告表示設定
  showAd = false,
  isDummyAd = false,
  adUnitId = '',
  rotationInterval = 5000,
  selectedModel = '',
  
  // スクロール関連
  messagesEndRef,
  scrollContainerRef
}: ChatMessageListProps) {
  // メッセージのキーを生成する関数
  const getMessageKey = (message: Message, index: number): string => {
    if (typeof message.content === 'string') {
      return `${message.role}-${index}-${message.content.slice(0, 10)}`;
    }
    
    if (Array.isArray(message.content) && message.content.length > 0) {
      const firstItem = message.content[0];
      if (firstItem.type === 'text' && firstItem.text) {
        return `${message.role}-${index}-${firstItem.text.slice(0, 10)}`;
      }
      
      if (firstItem.type === 'image_url') {
        return `${message.role}-${index}-image`;
      }
    }
    
    return `${message.role}-${index}`;
  };

  // 広告表示条件の判定
  const shouldShowAdAfterMessage = (index: number): boolean => {
    if (!showAd) return false;
    
    const message = messages[index];
    if (message.role !== 'assistant') return false;
    
    // 最後のメッセージまたは次のメッセージがユーザーのメッセージの場合
    return index === messages.length - 1 || 
      (index + 1 < messages.length && messages[index + 1].role === 'user');
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto pb-40 sm:pb-40 bg-background"
      style={keyboardAdjustStyle}
    >
      <div className="max-w-3xl mx-auto pt-4 sm:pt-6">
        {messages.length === 0 ? (
          <ChatEmptyState onSendMessage={onSendMessage} />
        ) : (
          <div className="px-4 sm:px-6 space-y-4 sm:space-y-6 pb-6">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div 
                  key={getMessageKey(message, index)}
                  variants={messageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ 
                    duration: 0.15, 
                    ease: "easeOut"
                  }}
                  className="relative"
                >
                  {/* メッセージ表示 */}
                  <ChatMessage
                    message={message}
                    isLoading={index === messages.length - 1 && isLoading && message.role === 'assistant'}
                  />
                  
                  {/* 広告表示 */}
                  {shouldShowAdAfterMessage(index) && (
                    <MessageAd 
                      isDummy={isDummyAd} 
                      adUnitId={adUnitId}
                      modelId={selectedModel}
                      rotationInterval={rotationInterval}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
} 