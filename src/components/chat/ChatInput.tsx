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

  // 音声入力の開始/停止をシミュレートする関数
  const toggleVoiceRecording = () => {
    // ブラウザが音声認識をサポートしているか確認（実際には使用可能性を確認する必要あり）
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsVoiceRecording(!isVoiceRecording);
      
      // ここでは実際の音声認識は実装せず、ボタンの状態変化のみをシミュレートします
      // 実際の実装では、ブラウザのSpeech Recognition APIを使用することができます
      
      if (!isVoiceRecording) {
        // 音声認識の開始をシミュレート
        setTimeout(() => {
          // 5秒後に停止し、サンプルテキストを追加
          setIsVoiceRecording(false);
          setText(prev => `${prev}${prev ? ' ' : ''}音声入力のサンプルテキストです。`);
        }, 3000);
      }
    } else {
      // 音声認識をサポートしていない場合はアラートを表示
      alert('お使いのブラウザは音声認識をサポートしていません。');
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

  // 送信ボタンを押せるかどうか
  const canSubmit = Boolean((text.trim() || images.length > 0) && !isLoading);

  return (
    <motion.div 
      className={`relative bg-background rounded-t-xl border shadow-lg ${isFocused ? 'pb-4 sm:pb-4' : ''} pt-3 px-3 sm:px-4`}
      style={isKeyboardVisible ? { 
        position: 'relative', 
        zIndex: 20,
        paddingBottom: isKeyboardVisible ? '8px' : undefined 
      } : undefined}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 画像プレビュー */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div 
            className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-1.5 pt-0.5"
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
      <div className="flex items-end gap-2">
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
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="h-10 w-10 rounded-full border-gray-200 touch-manipulation focus:border-primary transition-colors"
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
        
        {/* 音声入力ボタン */}
        <motion.div className="shrink-0 hidden sm:block" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleVoiceRecording}
            disabled={isLoading}
            className={`h-10 w-10 rounded-full border-gray-200 touch-manipulation transition-colors ${isVoiceRecording ? 'bg-primary text-primary-foreground' : ''}`}
            aria-label={isVoiceRecording ? "音声入力を停止" : "音声で入力"}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </motion.div>

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
            className="w-full resize-none bg-muted/70 border-0 rounded-xl py-3 px-4 pr-12 outline-none text-base leading-relaxed min-h-[42px] max-h-[200px] overflow-auto focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/70"
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

      {/* キーボード表示時には非表示にする注意書き */}
      <AnimatePresence>
        {!isKeyboardVisible && (
          <motion.div 
            className="mt-2 text-xs text-center text-muted-foreground px-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            Enterキーで送信、Shift+Enterで改行
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 