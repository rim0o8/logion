import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SendIcon } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [content, setContent] = useState("");

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
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="メッセージを送信..."
        className="min-h-[56px] max-h-[200px] resize-none pr-12 rounded-xl border-input bg-background focus:border-ring focus:ring-ring shadow-sm dark:shadow-none"
        disabled={isLoading}
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