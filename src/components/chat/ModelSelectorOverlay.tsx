import { AVAILABLE_MODELS, MODEL_PROVIDERS } from "@/config/llm";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModelSelectorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelectorOverlay({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel
}: ModelSelectorOverlayProps) {
  // モデルプロバイダーに基づいて色を決定
  const getModelColor = (modelId: string) => {
    if ((MODEL_PROVIDERS.CLAUDE as readonly string[]).includes(modelId)) return 'bg-purple-500';
    if ((MODEL_PROVIDERS.DEEPSEEK as readonly string[]).includes(modelId)) return 'bg-blue-500';
    return 'bg-green-500'; // OpenAIのデフォルト色
  };

  // モデル選択処理
  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ背景 */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* モデル選択パネル */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl shadow-lg z-50 max-h-[80vh] overflow-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="relative p-4">
              {/* 閉じるボタン */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-full p-1"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-semibold mb-4">モデルを選択</h3>

              {/* モデルリスト */}
              <div className="grid gap-2 mb-6">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    type="button"
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors touch-manipulation
                      ${selectedModel === model.id 
                        ? 'bg-primary/10 border-primary/30 border' 
                        : 'hover:bg-muted/60 border border-transparent'}`}
                  >
                    <span className={`h-3 w-3 rounded-full ${getModelColor(model.id)} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{model.description}</div>
                    </div>
                    {selectedModel === model.id && (
                      <span className="text-primary text-xs font-medium flex-shrink-0">使用中</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 確認ボタン */}
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium active:scale-95 transition-transform"
              >
                完了
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 