import { AVAILABLE_MODELS } from "@/config/llm";
import type { MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";
import { ChatInput } from "./ChatInput";

interface ChatInputAreaProps {
  onSendMessage: (content: MessageContent) => void;
  isLoading?: boolean;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  selectedModel: string;
  openSidebar: () => void;
}

export function ChatInputArea({
  onSendMessage,
  isLoading,
  isKeyboardVisible,
  viewportHeight,
  selectedModel,
  openSidebar
}: ChatInputAreaProps) {
  // モデル名を取得するヘルパー関数
  const getModelName = (modelId: string) => {
    const model = AVAILABLE_MODELS.find(model => model.id === modelId);
    return model ? model.name : modelId;
  };

  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 ${isKeyboardVisible ? 'keyboard-visible' : ''}`}
      style={{ 
        position: 'fixed',
        bottom: 0,
        width: '100%',
        zIndex: 10,
        transition: 'transform 0.2s ease-out',
        transform: isKeyboardVisible ? 'translateY(0)' : 'translateY(0)',
        boxShadow: '0 -8px 16px -12px rgba(0,0,0,0.05)'
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-4">
        {/* ChatGPTのように薄いグラデーションの境界線 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

        <div className="relative">
          {/* モデル選択ボタン */}
          {!isKeyboardVisible && (
            <div className="flex justify-center mb-2">
              <button
                type="button"
                onClick={openSidebar}
                className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-label="モデルを選択"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{getModelName(selectedModel)}</span>
              </button>
            </div>
          )}

          {/* 入力コンポーネント */}
          <div className="bg-background rounded-xl">
            <ChatInput 
              onSubmit={onSendMessage} 
              isLoading={isLoading} 
              modelId={selectedModel}
              isKeyboardVisible={isKeyboardVisible}
              viewportHeight={viewportHeight}
            />
          </div>

          {/* 免責事項 */}
          {!isKeyboardVisible && (
            <div className="text-xs text-center text-muted-foreground/70 mt-2.5">
              AIアシスタントは間違った情報を提供する可能性があります
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 