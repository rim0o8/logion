import { Button } from "@/components/ui/button";
import { supportsImageInput } from "@/config/model-capabilities";
import type { MessageContent, MessageContentItem } from "@/lib/llm/types";
import { processImageFile } from "@/lib/utils/imageProcessing";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Loader2, Mic, Send, X } from "lucide-react";
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
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
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

  // テキスト入力時のキーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enterの場合は改行を許可（そのまま）
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
    
    // Enterキーでメッセージを送信（モバイルでの送信を防止するためにキャンセル）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // メッセージが空でなく、ロード中でなければ送信
      if (canSubmit) {
        submitMessage();
      }
    }
  };

  // フォーカス状態の管理
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // 音声録音の切り替え
  const toggleVoiceRecording = () => {
    setIsVoiceRecording(!isVoiceRecording);
    
    // TODO: 実際の音声録音機能を実装
    if (!isVoiceRecording) {
      console.log('音声録音開始');
    } else {
      console.log('音声録音停止');
      // 録音の音声テキストを設定
      setText('音声入力テキストをここに設定');
    }
  };

  // メッセージ送信処理
  const handleSubmit = () => {
    if (!canSubmit) return;
    submitMessage();
  };

  // メッセージの送信とリセット
  const submitMessage = () => {
    const trimmedText = text.trim();
    
    // 画像がない場合はテキストのみ送信
    if (images.length === 0) {
      onSubmit(trimmedText);
    } else {
      // 画像がある場合はテキストと画像を含むメッセージコンテンツを作成
      const contentItems: MessageContentItem[] = [];
      
      // テキストがあれば追加
      if (trimmedText) {
        contentItems.push({
          type: 'text',
          text: trimmedText
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
    }
    
    // 入力をリセット
    setText('');
    setImages([]);
    
    // テキストエリアの高さもリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // フォーカスを保持
      textareaRef.current.focus();
    }
  };
  
  // 画像アップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // 各ファイルを処理
      const filePromises = Array.from(files).map(file => processImageFile(file));
      const processedImages = await Promise.all(filePromises);
      
      // 処理された画像を追加
      setImages(prevImages => {
        const newImages = [...prevImages];
        for (const img of processedImages) {
          if (img) {
            newImages.push({ url: img.base64 });
          }
        }
        return newImages;
      });
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      // TODO: エラーハンドリング
    } finally {
      setIsUploading(false);
      // ファイル選択をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // 画像削除処理
  const removeImage = (index: number) => {
    setImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // 送信ボタンを押せるかどうか
  const canSubmit = Boolean((text.trim() || images.length > 0) && !isLoading);

  return (
    <div className="relative">
      {/* 画像プレビュー */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div 
            className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-1.5 pt-0.5 px-3 sm:px-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {images.map((image, i) => (
              <motion.div 
                key={`image-url-${image.url.substring(0, 8)}-${i}`}
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <img 
                  src={image.url} 
                  alt="アップロード画像" 
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md border shadow-sm"
                />
                <motion.button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 touch-manipulation shadow-sm active:scale-95 transition-transform"
                  aria-label="画像を削除"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-3 w-3" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 入力エリア */}
      <div className="flex items-end gap-2 px-3 sm:px-4 pb-3 pt-3">
        {/* 画像アップロードボタン */}
        {imageInputSupported && (
          <motion.div className="shrink-0" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <input
              id="image-upload"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading || isUploading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="h-10 w-10 rounded-full touch-manipulation focus:ring-1 focus:ring-primary/30 transition-colors"
              aria-label="画像をアップロード"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </Button>
          </motion.div>
        )}
        
        {/* 音声入力ボタン - 非表示にしてシンプルに */}
        {false && (
          <motion.div className="shrink-0 hidden sm:block" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVoiceRecording}
              disabled={isLoading}
              className={`h-10 w-10 rounded-full touch-manipulation transition-colors ${isVoiceRecording ? 'bg-primary text-primary-foreground' : ''}`}
              aria-label={isVoiceRecording ? "音声入力を停止" : "音声で入力"}
            >
              <Mic className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* テキスト入力エリア */}
        <div className="flex-1 relative">
          <motion.textarea
            ref={textareaRef}
            value={text}
            onChange={autoResizeTextarea}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="メッセージを入力..."
            className="w-full resize-none bg-muted/30 border-0 rounded-xl py-3 px-4 pr-12 outline-none text-base leading-relaxed min-h-[42px] max-h-[200px] overflow-auto focus:ring-1 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/70"
            disabled={isLoading || isVoiceRecording}
            rows={1}
            spellCheck="false"
            style={{ 
              height: 'auto', // 初期高さは自動調整
              fontSize: isKeyboardVisible ? '16px' : undefined // iOS でズームしないように 16px 以上に
            }}
          />
          
          {/* 送信ボタン */}
          <motion.div 
            className="absolute bottom-1.5 right-1.5"
            initial={false}
            animate={{ scale: canSubmit ? 1 : 0.8, opacity: canSubmit ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="icon"
              className={`h-8 w-8 rounded-full shadow-sm ${canSubmit ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'} touch-manipulation transition-colors`}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 