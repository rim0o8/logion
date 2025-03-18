import type { MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";

interface ChatEmptyStateProps {
  onSendMessage: (content: MessageContent) => void;
  openSidebar: () => void;
}

export function ChatEmptyState({ onSendMessage, openSidebar }: ChatEmptyStateProps) {
  const suggestions = [
    '今日のニュースを教えて', 
    '簡単なパスタレシピを提案して',
    'プログラミング言語の選び方について教えて',
    '週末の東京の天気を教えて',
    '健康的な生活習慣についてのアドバイスが欲しい',
    '日本の歴史について教えて'
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] px-4 sm:px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          AIアシスタント
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-8">
          何でもお気軽にお尋ねください。情報提供、問題解決、アイデア出しなどをサポートします。
        </p>
        
        <button
          type="button"
          onClick={openSidebar}
          className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full text-sm font-medium bg-muted/50 hover:bg-muted text-foreground transition-colors mx-auto mb-8"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>モデルを選択</span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
              className="text-left p-3 sm:p-4 border rounded-lg text-sm hover:bg-muted/30 transition-colors"
              onClick={() => onSendMessage(suggestion)}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
} 