import type { Message } from "@/lib/llm/types";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex items-start gap-4 py-4 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-white" />
        </div>
      )}
      
      <div className={cn(
        "rounded-2xl px-4 py-3 max-w-[85%] break-words",
        isUser ? "bg-blue-600 text-white" : "bg-white border shadow-sm"
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            
            {isLoading && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            )}
          </>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-gray-600" />
        </div>
      )}
    </div>
  );
} 