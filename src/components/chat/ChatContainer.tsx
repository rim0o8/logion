import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { ChatInputArea } from "./ChatInputArea";
import { ChatMessageList } from "./ChatMessageList";
import { useViewportHeight } from "./hooks/useViewportHeight";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: MessageContent, modelId: string) => void;
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
  const { isKeyboardVisible, viewportHeight, keyboardAdjustStyle } = useViewportHeight();

  // 広告表示ロジック
  const { showAd, adUnitId, isDummyAd, rotationInterval } = useBannerAd(selectedModel);

  const handleSendMessage = (content: MessageContent) => {
    onSendMessage(content, selectedModel);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <ChatMessageList 
        messages={messages}
        isLoading={isLoading}
        showAd={showAd}
        isDummyAd={isDummyAd}
        adUnitId={adUnitId}
        rotationInterval={rotationInterval}
        selectedModel={selectedModel}
        onSendMessage={handleSendMessage}
        keyboardAdjustStyle={keyboardAdjustStyle}
      />

      <ChatInputArea 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isKeyboardVisible={isKeyboardVisible}
        viewportHeight={viewportHeight}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel || (() => {})}
      />
    </div>
  );
} 