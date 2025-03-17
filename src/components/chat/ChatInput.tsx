import { Button } from "@/components/ui/button";
import { supportsImageInput } from "@/config/model-capabilities";
import type { MessageContent, MessageContentItem } from "@/lib/llm/types";
import { ImageIcon, Loader2, SendIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSubmit: (content: MessageContent) => void;
  isLoading?: boolean;
  modelId: string;
  isKeyboardVisible?: boolean;
  viewportHeight?: number;
}

export function ChatInput({ onSubmit, isLoading, modelId, isKeyboardVisible, viewportHeight }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ url: string; file: File }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // モデルが画像入力をサポートしているかを確認
  const imageInputSupported = supportsImageInput(modelId);

  // モデルが変更された時に、画像入力不可モデルに変更された場合は画像をクリア
  useEffect(() => {
    if (!imageInputSupported && images.length > 0) {
      // 画像をクリア
      setImages([]);
    }
  }, [imageInputSupported, images.length]);

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

  // フォーカス時にスクロール位置を調整
  const handleFocus = () => {
    setIsFocused(true);
    // モバイルでキーボードが表示された時のスクロール処理は
    // ChatContainerコンポーネントのvisualViewport処理に任せる
    // スクロール処理を削除
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSubmit = () => {
    if ((!text.trim() && images.length === 0) || isLoading) return;
    
    // テキストのみの場合は文字列として送信
    if (text.trim() && images.length === 0) {
      onSubmit(text);
      setText("");
      return;
    }
    
    // マルチモーダルコンテンツの場合は配列として送信
    const contentItems: MessageContentItem[] = [];
    
    if (text.trim()) {
      contentItems.push({
        type: 'text',
        text: text.trim()
      });
    }
    
    // 画像を追加
    for (const image of images) {
      contentItems.push({
        type: 'image_url',
        image_url: {
          url: image.url
        }
      });
    }
    
    onSubmit(contentItems);
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
    for (const file of Array.from(files)) {
      // 画像ファイルのみを許可
      if (!file.type.startsWith('image/')) continue;
      
      // 画像を圧縮して処理
      compressImage(file).then(compressedFile => {
        // FileReaderを使用してBase64形式に変換
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Url = e.target?.result as string;
          setImages(prev => [...prev, { url: base64Url, file: compressedFile }]);
        };
        reader.readAsDataURL(compressedFile);
      });
    }
    
    // ファイル選択をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 画像を圧縮する関数
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // 5MBを超える場合のみ圧縮
      if (file.size <= 5 * 1024 * 1024) {
        resolve(file);
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // 元のアスペクト比を維持
          let width = img.width;
          let height = img.height;
          
          // 大きすぎる画像はリサイズ
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 品質を調整して圧縮（0.7は70%の品質）
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 新しいFileオブジェクトを作成
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                resolve(compressedFile);
              } else {
                // 圧縮に失敗した場合は元のファイルを使用
                resolve(file);
              }
            },
            'image/jpeg',
            0.7
          );
        };
      };
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  return (
    <div className={`border-t bg-background p-2 sm:p-4 ${isFocused ? 'pb-4 sm:pb-6' : ''}`}
      style={isKeyboardVisible ? { position: 'relative', zIndex: 20 } : undefined}
    >
      {/* 画像プレビュー */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((image, i) => (
            <div key={`image-${i}-${image.file.name}`} className="relative">
              <img 
                src={image.url} 
                alt="アップロード画像" 
                className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 touch-manipulation"
                aria-label="画像を削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={autoResizeTextarea}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="メッセージを入力..."
            className="resize-none w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-[200px]"
            style={{ 
              height: '44px',
              ...(isKeyboardVisible && viewportHeight ? { maxHeight: `${viewportHeight * 0.2}px` } : {})
            }}
          />
        </div>
        
        {/* 画像アップロードボタン - モデルがサポートしている場合のみ表示 */}
        {imageInputSupported && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-10 w-10 touch-manipulation"
            aria-label="画像をアップロード"
          >
            <ImageIcon className="h-5 w-5" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </Button>
        )}
        
        <Button 
          type="button" 
          size="icon" 
          onClick={handleSubmit}
          disabled={(!text.trim() && images.length === 0) || isLoading}
          className="h-10 w-10 touch-manipulation"
          aria-label="メッセージを送信"
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