import { motion } from "framer-motion";
import { ModelSelector } from "./ModelSelector";

interface ChatSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedModel: string;
  onSelectModel?: (modelId: string) => void;
}

export function ChatSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedModel,
  onSelectModel
}: ChatSidebarProps) {
  return (
    <>
      {/* サイドパネル（モバイル用） */}
      <motion.div 
        className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-background border-r shadow-lg z-30"
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ ease: 'easeInOut', duration: 0.3 }}
      >
        <div className="p-4 h-full flex flex-col">
          <h3 className="text-xl font-semibold mb-4">チャット設定</h3>
          {onSelectModel && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">モデルを選択</p>
              <ModelSelector 
                selectedModel={selectedModel} 
                onSelectModel={(model) => {
                  onSelectModel(model);
                  setIsSidebarOpen(false);
                }} 
              />
            </div>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium active:scale-95 transition-transform"
          >
            閉じる
          </button>
        </div>
      </motion.div>

      {/* オーバーレイ（サイドバー表示時） */}
      {isSidebarOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/40 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
} 