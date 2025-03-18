import type { MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";

interface ChatInputAreaProps {
  onSendMessage: (content: MessageContent) => void;
  isLoading?: boolean;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  selectedModel: string;
  onSelectModel?: (modelId: string) => void;
  openSidebar: () => void;
}

export function ChatInputArea({
  onSendMessage,
  isLoading,
  isKeyboardVisible,
  viewportHeight,
  selectedModel,
  onSelectModel,
  openSidebar
}: ChatInputAreaProps) {
  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 bg-background border-t z-10 dark:border-border ${isKeyboardVisible ? 'keyboard-visible' : ''}`}
      style={{ 
        position: 'fixed',
        bottom: 0,
        width: '100%',
        zIndex: 10,
        transition: 'transform 0.2s ease-out',
        transform: isKeyboardVisible ? 'translateY(0)' : 'translateY(0)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-safe">
        <div className={`flex items-center justify-between gap-2 my-2 ${isKeyboardVisible ? 'hidden' : ''}`}>
          <button
            type="button"
            onClick={openSidebar}
            className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="設定を開く"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 12H15M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {onSelectModel && (
            <div className="hidden sm:block">
              <ModelSelector 
                selectedModel={selectedModel} 
                onSelectModel={onSelectModel} 
              />
            </div>
          )}
        </div>
        <ChatInput 
          onSubmit={onSendMessage} 
          isLoading={isLoading} 
          modelId={selectedModel}
          isKeyboardVisible={isKeyboardVisible}
          viewportHeight={viewportHeight}
        />
        <div className={`mt-1 sm:mt-2 text-xs text-center text-muted-foreground px-2 pb-2 ${isKeyboardVisible ? 'hidden' : ''}`}>
          AIアシスタントは間違った情報を提供する可能性があります。重要な決断には必ず情報を検証してください。
        </div>
      </div>
    </motion.div>
  );
} 