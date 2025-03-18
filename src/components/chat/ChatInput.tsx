import { Button } from "@/components/ui/button";
import { supportsImageInput } from "@/config/model-capabilities";
import type { MessageContent, MessageContentItem } from "@/lib/llm/types";
import { processImageFile } from "@/lib/utils/imageProcessing";
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
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 最大処理画像数（モバイル端末でのメモリ制限対策）
    const maxImages = 3;
    let processedCount = 0;
    
    setIsUploading(true);
    console.log('画像アップロード開始');
    
    try {
      // 選択された各ファイルを処理
      for (const file of Array.from(files)) {
        // 処理画像数の制限
        if (processedCount >= maxImages) {
          console.warn(`最大${maxImages}枚までの画像を処理します。残りの画像はスキップされました。`);
          break;
        }
        
        // 画像ファイルのみを許可
        if (!file.type.startsWith('image/')) continue;
        
        // ファイルサイズの確認（50MB以上は処理しない）
        if (file.size > 50 * 1024 * 1024) {
          console.error('ファイルが大きすぎます（50MB以上）。処理をスキップします。');
          continue;
        }
        
        try {
          // 処理開始を伝えるUI表示があると良い（ここではコンソールログのみ）
          console.log(`画像処理中: ${file.name}`);
          
          // 処理タイムアウト（30秒）
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('画像処理がタイムアウトしました')), 30000);
          });
          
          // ユーティリティ関数を使用して画像を処理
          const maxFileSize = 5 * 1024 * 1024; // 5MB
          const processPromise = processImageFile(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.7,
            format: 'image/jpeg',
            sizeThreshold: maxFileSize, // 5MB以下は圧縮しない
            targetSize: file.size > maxFileSize ? maxFileSize : undefined // 5MBより大きい場合のみ圧縮対象に
          });
          
          // タイムアウトか処理完了のどちらか早い方
          const { base64, file: compressedFile } = await Promise.race([
            processPromise,
            timeoutPromise
          ]);
          
          console.log('画像処理完了:', compressedFile.name);
          
          // APIを呼び出して画像をアップロード
          console.log('Firebase Storageにアップロード開始');
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              imageData: base64, 
              fileName: compressedFile.name 
            }),
          });
          
          if (!response.ok) {
            throw new Error(`アップロード失敗: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('アップロード応答:', data);
          
          if (data.success && data.url) {
            // アップロードされたURLを保存
            setImages(prev => [...prev, { url: data.url }]);
            processedCount++;
            console.log('画像アップロード成功:', data.url);
          } else {
            throw new Error('アップロードレスポンスにURLがありません');
          }
        } catch (error) {
          console.error('画像処理・アップロードエラー:', error);
          // エラーメッセージをユーザーに表示する仕組みがあると良い
        }
      }
    } finally {
      setIsUploading(false);
      console.log('画像アップロード処理完了');
      
      // ファイル選択をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  return (
    <div 
      className={`border-t bg-background p-2 sm:p-4 ${isFocused ? 'pb-4 sm:pb-6' : ''}`}
      style={isKeyboardVisible ? { 
        position: 'relative', 
        zIndex: 20,
        paddingBottom: isKeyboardVisible ? '8px' : undefined 
      } : undefined}
    >
      {/* 画像プレビュー */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <div key={`image-${i}`} className="relative">
              <img 
                src={image.url} 
                alt="アップロード画像" 
                className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md border shadow-sm"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 touch-manipulation shadow-sm active:scale-95 transition-transform"
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
          <div className="relative">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="h-10 w-10 touch-manipulation active:scale-95 transition-transform"
              aria-label="画像をアップロード"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}
        
        <Button 
          type="button" 
          size="icon" 
          onClick={handleSubmit}
          disabled={(!text.trim() && images.length === 0) || isLoading || isUploading}
          className="h-10 w-10 touch-manipulation active:scale-95 transition-transform"
          aria-label="メッセージを送信"
        >
          {isLoading || isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
} 