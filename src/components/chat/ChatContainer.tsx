import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { useEffect, useRef, useState } from 'react';
import { ChatInputArea } from "./ChatInputArea";
import { ChatMessageList } from "./ChatMessageList";
import { useAutoScroll } from './hooks/useAutoScroll';
import { useViewportHeight } from "./hooks/useViewportHeight";

/**
 * チャットコンテナのProps
 */
interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: MessageContent, modelId: string) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

/**
 * チャットコンテナコンポーネント
 * チャットUIの全体構造とスクロール制御を管理
 */
export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  selectedModel = DEFAULT_MODEL,
  onSelectModel,
}: ChatContainerProps) {
  // ビューポート（キーボード表示）の管理
  const { isKeyboardVisible, viewportHeight, keyboardAdjustStyle } = useViewportHeight();
  
  // スクロール関連のフック
  const { 
    messagesEndRef, 
    scrollContainerRef, 
    scrollToBottom
  } = useAutoScroll();

  // 広告表示の管理
  const { showAd, adUnitId, isDummyAd, rotationInterval } = useBannerAd(selectedModel);

  // 最後のメッセージコンテンツを追跡
  const lastAssistantMessageRef = useRef<string>('');
  
  // ストリーム生成が開始したかどうかを追跡
  const [streamingStarted, setStreamingStarted] = useState(false);

  // メッセージの数が変わったらスクロール
  useEffect(() => {
    // メッセージが存在する場合のみスクロール
    if (messages.length > 0) {
      // ストリーミング中は追加のスクロールを行わない
      if (isLoading && streamingStarted) return;
      
      // 新しいメッセージが追加された場合のみ1回だけスクロール
      const timeoutId = setTimeout(scrollToBottom, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [messages.length, scrollToBottom, isLoading, streamingStarted]);

  // ローディングが完了した時にスクロール
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      // ストリーミングが終了したらリセット
      setStreamingStarted(false);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // AIメッセージが変更されたときのスクロール制御（節約）
  useEffect(() => {
    if (messages.length > 0 && isLoading) {
      const lastMessage = messages[messages.length - 1];
      
      // 最後のメッセージがアシスタントからのものであれば
      if (lastMessage.role === 'assistant') {
        let currentContent = '';
        
        // コンテンツの取得
        if (typeof lastMessage.content === 'string') {
          currentContent = lastMessage.content;
        } else if (Array.isArray(lastMessage.content) && lastMessage.content.length > 0) {
          const firstItem = lastMessage.content[0];
          if (firstItem.type === 'text' && firstItem.text) {
            currentContent = firstItem.text;
          }
        }
        
        // コンテンツが大幅に変わった場合のみスクロール
        if (currentContent.length - lastAssistantMessageRef.current.length > 50) {
          scrollToBottom();
          lastAssistantMessageRef.current = currentContent;
        } else if (!streamingStarted && currentContent.trim() !== '') {
          // ストリーミング開始時に一度だけスクロール
          setStreamingStarted(true);
          scrollToBottom();
          lastAssistantMessageRef.current = currentContent;
        }
      }
    }
  }, [messages, scrollToBottom, isLoading, streamingStarted]);

  // 初回レンダリング時にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [scrollToBottom, messages.length]);

  // メッセージ送信ハンドラ
  const handleSendMessage = (content: MessageContent) => {
    onSendMessage(content, selectedModel);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* メッセージリスト */}
      <ChatMessageList 
        messages={messages}
        isLoading={isLoading && !streamingStarted}
        showAd={showAd}
        isDummyAd={isDummyAd}
        adUnitId={adUnitId}
        rotationInterval={rotationInterval}
        selectedModel={selectedModel}
        onSendMessage={handleSendMessage}
        keyboardAdjustStyle={keyboardAdjustStyle}
        scrollContainerRef={scrollContainerRef}
      />

      {/* スクロール位置調整用の要素 */}
      <div ref={messagesEndRef} className="h-16 min-h-16 w-full" aria-hidden="true" />

      {/* 入力エリア */}
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