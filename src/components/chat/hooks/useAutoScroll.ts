import { useCallback, useRef } from "react";

/**
 * チャットのスクロール自動制御フック
 * 新しいメッセージが追加された時に自動的に下部にスクロールする機能を提供
 */
export function useAutoScroll() {
  // メッセージリストの最下部を参照するためのref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // スクロール可能なコンテナを参照するためのref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 最後のスクロール実行時間を記録
  const lastScrollTimeRef = useRef<number>(0);

  /**
   * メッセージの終わりまでスクロールする関数
   * 頻繁なスクロールによるパフォーマンス低下を防止
   */
  const scrollToBottom = useCallback(() => {
    const now = Date.now();
    
    // 前回のスクロールから100ms以上経過している場合のみスクロールを実行
    if (now - lastScrollTimeRef.current > 100) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
        lastScrollTimeRef.current = now;
      }
    }
  }, []);

  return {
    messagesEndRef,
    scrollContainerRef,
    scrollToBottom,
  };
} 