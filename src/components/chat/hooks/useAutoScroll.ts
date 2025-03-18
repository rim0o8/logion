import { useCallback, useEffect, useRef } from "react";

export function useAutoScroll() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
  }, [scrollToBottom]); // scrollToBottomを依存配列に追加

  return { messagesEndRef, scrollContainerRef, scrollToBottom };
} 