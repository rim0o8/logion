import type { Message, MessageContentItem } from "@/lib/llm/types";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { Markdown } from "../ui/Markdown";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // メッセージコンテンツを表示する関数
  const renderContent = () => {
    const { content } = message;
    
    // 文字列の場合（従来の形式）
    if (typeof content === 'string') {
      return isUser ? (
        <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>
      ) : (
        <Markdown content={content} className="text-sm sm:text-base" />
      );
    }
    
    // 配列の場合（マルチモーダル）
    return (
      <div className="flex flex-col gap-2">
        {content.map((item: MessageContentItem, index: number) => {
          // 一意のキーを生成
          const uniqueKey = `${item.type}-${index}-${
            item.type === 'text' 
              ? item.text?.substring(0, 10) 
              : item.type === 'image_url' 
                ? 'img' 
                : 'unknown'
          }`;
          
          if (item.type === 'text' && item.text) {
            return isUser ? (
              <p key={uniqueKey} className="whitespace-pre-wrap text-sm sm:text-base">{item.text}</p>
            ) : (
              <Markdown key={uniqueKey} content={item.text} className="text-sm sm:text-base" />
            );
          }
          
          if (item.type === 'image_url' && item.image_url) {
            return (
              <button 
                key={uniqueKey} 
                type="button"
                className="max-w-full overflow-hidden bg-transparent border-0 p-0 cursor-zoom-in"
                onClick={(e) => {
                  const imgContainer = e.currentTarget;
                  const img = imgContainer.querySelector('img');
                  if (img) toggleImageExpand(img as HTMLImageElement);
                }}
                aria-label="画像を拡大/縮小"
              >
                <img 
                  src={item.image_url.url} 
                  alt="画像" 
                  className="max-w-full max-h-[200px] sm:max-h-[300px] object-contain rounded-md shadow-sm hover:shadow-md transition-shadow"
                  loading="lazy"
                />
              </button>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  // 画像の拡大/縮小を切り替える関数
  const toggleImageExpand = (img: HTMLImageElement) => {
    if (img.classList.contains('expanded')) {
      img.classList.remove('expanded');
      img.style.maxHeight = '';
      img.style.objectFit = '';
      img.style.cursor = '';
    } else {
      img.classList.add('expanded');
      img.style.maxHeight = '80vh';
      img.style.objectFit = 'contain';
      img.style.cursor = 'zoom-out';
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2 sm:gap-4 py-2 sm:py-4 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* モバイルでも小さいアイコンを表示 */}
      {!isUser && (
        <div className="flex h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary-foreground" />
        </div>
      )}

      <div className={cn(
        "rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] break-words",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-card text-card-foreground border shadow-sm dark:border-border dark:shadow-none"
      )}>
        {renderContent()}

        {isLoading && (typeof message.content === 'string' ? message.content.length === 0 : false) && (
          <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1.5 sm:mt-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        )}
      </div>

      {/* モバイルでも小さいアイコンを表示 */}
      {isUser && (
        <div className="flex h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
} 