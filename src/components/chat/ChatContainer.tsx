import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ChatInputArea } from "./ChatInputArea";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSidebar } from './ChatSidebar';
import { useViewportHeight } from "./hooks/useViewportHeight";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: MessageContent, model?: string) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading,
  selectedModel = DEFAULT_MODEL,
  onSelectModel,
}: ChatContainerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isKeyboardVisible, viewportHeight, keyboardAdjustStyle } = useViewportHeight();

  // 広告表示ロジック
  const { showAd, adUnitId, isDummyAd, rotationInterval } = useBannerAd(selectedModel);

  // スワイプジェスチャーハンドラーの設定
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => setIsSidebarOpen(true),
    onSwipedLeft: () => setIsSidebarOpen(false),
    trackMouse: false,
    delta: 50,
  });

  const handleSendMessage = (content: MessageContent) => {
    onSendMessage(content, selectedModel);
    // メッセージ送信時にサイドバーを閉じる
    setIsSidebarOpen(false);
  };

  const openSidebar = () => setIsSidebarOpen(true);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden" {...swipeHandlers}>
      <ChatSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
      />

      <ChatMessageList 
        messages={messages}
        isLoading={isLoading}
        showAd={showAd}
        isDummyAd={isDummyAd}
        adUnitId={adUnitId}
        rotationInterval={rotationInterval}
        selectedModel={selectedModel}
        onSendMessage={handleSendMessage}
        openSidebar={openSidebar}
        keyboardAdjustStyle={keyboardAdjustStyle}
      />

      <ChatInputArea 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isKeyboardVisible={isKeyboardVisible}
        viewportHeight={viewportHeight}
        selectedModel={selectedModel}
        openSidebar={openSidebar}
      />
    </div>
  );
} 