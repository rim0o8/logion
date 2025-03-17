import { Message, MessageContentItem } from "@/lib/llm/types";
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
        <p className="whitespace-pre-wrap">{content}</p>
      ) : (
        <Markdown content={content} />
      );
    }
    
    // 配列の場合（マルチモーダル）
    return (
      <div className="flex flex-col gap-2">
        {content.map((item: MessageContentItem, index: number) => {
          if (item.type === 'text' && item.text) {
            return isUser ? (
              <p key={`text-${index}`} className="whitespace-pre-wrap">{item.text}</p>
            ) : (
              <Markdown key={`text-${index}`} content={item.text} />
            );
          }
          
          if (item.type === 'image_url' && item.image_url) {
            return (
              <div key={`image-${index}`} className="max-w-full overflow-hidden">
                <img 
                  src={item.image_url.url} 
                  alt="画像" 
                  className="max-w-full max-h-[300px] object-contain rounded-md"
                />
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-start gap-4 py-4 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
      )}

      <div className={cn(
        "rounded-2xl px-4 py-3 max-w-[85%] break-words",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-card text-card-foreground border shadow-sm dark:border-border dark:shadow-none"
      )}>
        {renderContent()}

        {isLoading && (typeof message.content === 'string' ? message.content.length === 0 : false) && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
} 