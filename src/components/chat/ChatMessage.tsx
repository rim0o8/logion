import type { Message, MessageContentItem } from "@/lib/llm/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, Copy, MoreHorizontal, User } from "lucide-react";
import { useRef, useState } from "react";
import { Markdown } from "../ui/Markdown";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);

  // メッセージの内容をコピーする関数
  const copyMessageToClipboard = () => {
    if (!messageContentRef.current) return;
    
    const text = getMessageText();
    
    // クリップボードにコピー
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
    
    // メニューを閉じる
    setIsMenuOpen(false);
  };
  
  // メッセージテキストを取得する関数
  const getMessageText = (): string => {
    const { content } = message;
    
    if (typeof content === 'string') {
      return content;
    }
    
    // 配列の場合は、テキスト部分だけを連結
    return content
      .filter(item => item.type === 'text' && item.text)
      .map(item => (item as {type: 'text', text: string}).text)
      .join("\n\n");
  };

  // メニューの外側をクリックした時に閉じる
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsMenuOpen(false);
    }
  };

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
              <motion.button 
                key={uniqueKey} 
                type="button"
                className="relative max-w-full overflow-hidden bg-transparent border-0 p-0 cursor-zoom-in transition-all duration-300 rounded-lg hover:shadow-lg"
                onClick={(e) => {
                  const imgContainer = e.currentTarget;
                  const img = imgContainer.querySelector('img');
                  if (img) toggleImageExpand(img as HTMLImageElement);
                }}
                aria-label="画像を拡大/縮小"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.img 
                  src={item.image_url.url} 
                  alt="画像"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ duration: 0.3 }}
                  className="max-w-full max-h-[200px] sm:max-h-[300px] object-contain rounded-md shadow-sm hover:shadow-md transition-shadow"
                  loading="lazy"
                />
              </motion.button>
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
    <motion.div 
      className={cn(
        "flex items-start gap-2 sm:gap-4 py-2 sm:py-4 group relative",
        isUser ? "justify-end" : "justify-start"
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={handleOutsideClick}
      layout
    >
      {/* アシスタントアイコン */}
      {!isUser && (
        <motion.div 
          className="flex h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary items-center justify-center shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        </motion.div>
      )}

      {/* メッセージ本文 */}
      <motion.div 
        ref={messageContentRef}
        className={cn(
          "relative rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] break-words shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-card text-card-foreground border dark:border-border dark:shadow-none rounded-tl-sm"
        )}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {renderContent()}

        {/* ローディングインジケーター */}
        {isLoading && (typeof message.content === 'string' ? message.content.length === 0 : false) && (
          <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1.5 sm:mt-2">
            <motion.div 
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary" 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "loop" }}
            />
            <motion.div 
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary" 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
            />
            <motion.div 
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary" 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "loop", delay: 0.4 }}
            />
          </div>
        )}

        {/* コンテキストメニューボタン (アシスタントメッセージのみ) */}
        {!isUser && !isLoading && (
          <motion.button
            type="button"
            className="absolute right-2 top-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted/80 focus:outline-none transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="メッセージオプション"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}

        {/* メニュー */}
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            className="absolute top-8 right-2 bg-popover text-popover-foreground shadow-md rounded-lg overflow-hidden z-10 border"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm hover:bg-muted transition-colors"
              onClick={copyMessageToClipboard}
            >
              <Copy className="h-4 w-4" />
              <span>{isCopied ? "コピーしました" : "テキストをコピー"}</span>
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* ユーザーアイコン */}
      {isUser && (
        <motion.div 
          className="flex h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted items-center justify-center shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
} 