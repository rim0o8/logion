import { DEFAULT_MODEL } from '@/config/llm';
import { useBannerAd } from '@/lib/ads/webAdManager';
import type { Message, MessageContent } from "@/lib/llm/types";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { DummyBannerAd } from "../ads/DummyBannerAd";
import { WebBannerAd } from "../ads/WebBannerAd";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ModelSelector } from "./ModelSelector";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ビューポートの高さを監視
  useEffect(() => {
    const setInitialHeight = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    setInitialHeight();

    // visualViewportのリサイズイベントを監視（モバイルキーボード対応）
    const handleResize = () => {
      if (window.visualViewport) {
        const newHeight = window.visualViewport.height;
        // キーボードが表示されたかどうかを判定
        const heightDifference = window.innerHeight - newHeight;
        setIsKeyboardVisible(heightDifference > 150); // 150px以上の差があればキーボードが表示されたと判断
        setViewportHeight(newHeight);
      }
    };

    // visualViewportが利用可能な場合はそれを使用
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      // フォールバックとしてwindowのリサイズイベントを使用
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    const handleUpdate = () => {
      scrollToBottom();
    };

    handleUpdate();

    // messagesやisLoadingが変更されたときにスクロールする
    const observer = new MutationObserver(handleUpdate);
    const container = scrollContainerRef.current;

    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, []); // 依存配列を空にする - MutationObserverが変更を検知するため

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (content: MessageContent) => {
    onSendMessage(content, selectedModel);
    // メッセージ送信時にサイドバーを閉じる
    setIsSidebarOpen(false);
  };

  // 広告表示ロジック
  const { showAd, adUnitId, isDummyAd, rotationInterval } = useBannerAd(selectedModel);

  // スワイプジェスチャーハンドラーの設定
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => setIsSidebarOpen(true),
    onSwipedLeft: () => setIsSidebarOpen(false),
    trackMouse: false,
    delta: 50,
  });

  // メッセージのキーを生成する関数
  const getMessageKey = (message: Message, index: number) => {
    if (typeof message.content === 'string') {
      return `${message.content.slice(0, 10)}-${index}`;
    }
    
    if (Array.isArray(message.content) && message.content.length > 0) {
      const firstItem = message.content[0];
      if (firstItem.type === 'text' && firstItem.text) {
        return `${firstItem.text.slice(0, 10)}-${index}`;
      }
      
      if (firstItem.type === 'image_url') {
        return `image-${index}`;
      }
    }
    
    return `message-${index}`;
  };

  // キーボードが表示されている時のスタイル調整
  const keyboardAdjustStyle = isKeyboardVisible ? {
    paddingBottom: `calc(${viewportHeight * 0.4}px)`,
    height: `${viewportHeight}px`,
    maxHeight: `${viewportHeight}px`,
    transition: 'padding-bottom 0.2s ease-out'
  } : {};

  return (
    <div className="flex flex-col h-full bg-background relative" {...swipeHandlers}>
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

      {/* メッセージエリア */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-36 sm:pb-32 bg-background"
        style={keyboardAdjustStyle}
      >
        <div className="max-w-3xl mx-auto pt-4 sm:pt-6">
          {messages.length === 0 ? (
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
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-3 px-4 rounded-lg mb-3 flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <span>モデルを選択</span>
                </button>

                <div className="mt-6 space-y-2">
                  {['今日のニュースを教えて', '簡単なレシピを提案して', 'プログラミングについて学びたい'].map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="w-full text-left p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="px-3 sm:px-4 space-y-1 sm:space-y-2 pb-2">
              {messages.map((message, index) => (
                <motion.div 
                  key={getMessageKey(message, index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage
                    message={message}
                    isLoading={index === messages.length - 1 && isLoading && message.role === 'assistant'}
                  />
                  
                  {/* 設定に基づいて広告を表示 */}
                  {showAd && message.role === 'assistant' && (
                    (index === messages.length - 1 || 
                     (index + 1 < messages.length && messages[index + 1].role === 'user')) ? (
                      <div className="w-full flex justify-center my-2 sm:my-3">
                        {isDummyAd ? (
                          <DummyBannerAd
                            className="w-full max-w-3xl rounded-lg overflow-hidden"
                            modelId={selectedModel}
                            rotationInterval={rotationInterval}
                          />
                        ) : (
                          <WebBannerAd
                            adUnitId={adUnitId}
                            className="w-full max-w-md h-16 rounded-lg overflow-hidden"
                          />
                        )}
                      </div>
                    ) : null
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
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
              onClick={() => setIsSidebarOpen(true)}
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
            onSubmit={handleSendMessage} 
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
    </div>
  );
} 