import { Button } from "@/components/ui/button";
import { Loader2, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整する関数
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    
    // 高さをリセットして実際のコンテンツの高さを取得
    textarea.style.height = 'auto';
    
    // スクロール高さに基づいて高さを設定（最小高さと最大高さの制限付き）
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
    textarea.style.height = `${newHeight}px`;

    // テキスト内容を更新
    setContent(textarea.value);
  };

  // contentが変更されたときにテキストエリアの高さを調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  const handleSubmit = () => {
    if (!content.trim() || isLoading) return;
    onSubmit(content);
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={autoResizeTextarea}
        placeholder="メッセージを入力..."
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        rows={1}
        style={{ minHeight: '40px', maxHeight: '200px' }}
        onKeyDown={handleKeyDown}
      />
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || isLoading}
        size="icon"
        className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
        variant="default"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
} 