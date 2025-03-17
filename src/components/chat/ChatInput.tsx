import { Button } from "@/components/ui/button";
import { MessageContent, MessageContentItem } from "@/lib/llm/types";
import { ImageIcon, Loader2, SendIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSubmit: (content: MessageContent) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ url: string; file: File }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // テキストエリアの高さを自動調整する関数
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    
    // 高さをリセットして実際のコンテンツの高さを取得
    textarea.style.height = 'auto';
    
    // スクロール高さに基づいて高さを設定（最小高さと最大高さの制限付き）
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
    textarea.style.height = `${newHeight}px`;

    // テキスト内容を更新
    setText(textarea.value);
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
    if ((!text.trim() && images.length === 0) || isLoading) return;
    
    // テキストのみの場合は文字列として送信
    if (text.trim() && images.length === 0) {
      onSubmit(text);
    } else {
      // マルチモーダルコンテンツの場合は配列として送信
      const contentItems: MessageContentItem[] = [];
      
      if (text.trim()) {
        contentItems.push({
          type: 'text',
          text: text.trim()
        });
      }
      
      // 画像を追加
      images.forEach(image => {
        contentItems.push({
          type: 'image_url',
          image_url: {
            url: image.url
          }
        });
      });
      
      onSubmit(contentItems);
    }
    
    setText("");
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 選択された各ファイルを処理
    Array.from(files).forEach(file => {
      // 画像ファイルのみを許可
      if (!file.type.startsWith('image/')) return;
      
      // データURLを作成
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImages(prev => [...prev, { url, file }]);
      };
      reader.readAsDataURL(file);
    });
    
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative">
      {/* 画像プレビュー */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img 
                src={image.url} 
                alt="アップロード画像" 
                className="h-20 w-20 object-cover rounded-md border border-input"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={autoResizeTextarea}
          placeholder="メッセージを入力..."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={1}
          style={{ minHeight: '40px', maxHeight: '200px' }}
          onKeyDown={handleKeyDown}
        />
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="icon"
          className="ml-2 h-10 w-10 rounded-lg"
          variant="outline"
          type="button"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={(!text.trim() && images.length === 0) || isLoading}
          size="icon"
          className="ml-2 h-10 w-10 rounded-lg"
          variant="default"
          type="button"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
} 