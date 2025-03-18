import type { MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";

interface ChatEmptyStateProps {
  onSendMessage: (content: MessageContent) => void;
}

export function ChatEmptyState({ onSendMessage }: ChatEmptyStateProps) {
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
        <h2 className="text-2xl font-bold tracking-tight mb-2">AIチャットアシスタント</h2>
        <p className="text-muted-foreground mb-6 max-w-md">複数のAIモデルに質問できます。あなたの質問に対して最適な回答を返します。</p>
        
        <div className="space-y-2 w-full max-w-md">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">こんな質問から始めましょう：</h3>
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
        </div>
      </motion.div>
    </div>
  );
} 