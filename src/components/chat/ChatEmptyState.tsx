import type { MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";

interface ChatEmptyStateProps {
  onSendMessage: (content: MessageContent) => void;
  openSidebar: () => void;
}

export function ChatEmptyState({ onSendMessage, openSidebar }: ChatEmptyStateProps) {
  const suggestions = ['今日のニュースを教えて', '簡単なレシピを提案して', 'プログラミングについて学びたい'];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xs"
      >
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
          AIアシスタント
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6">
          何でもお気軽にお尋ねください。情報提供、問題解決、アイデア出しなどをサポートします。
        </p>
        
        <button
          type="button"
          onClick={openSidebar}
          className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-3 px-4 rounded-lg mb-3 flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <span>モデルを選択</span>
        </button>

        <div className="mt-6 space-y-2">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="w-full text-left p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
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