'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, Bot, Check, Copy, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface ChatContentProps {
  conversationId: string;
}

export default function ChatContent({ conversationId }: ChatContentProps) {
  const [messages, setMessages] = useState<Array<{ id: string, role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 会話履歴を取得
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setIsInitialLoading(true);

        // ローカルストレージから初期会話データを取得
        const storedChat = localStorage.getItem(`chat-${conversationId}`);
        if (storedChat) {
          const chatData = JSON.parse(storedChat);
          const typedMessages = chatData.messages.map((msg: { role: 'user' | 'assistant'; content: string }, index: number) => ({
            id: `msg-${Date.now()}-${index}`,
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          setMessages(typedMessages);
        }
      } catch (error) {
        console.error('会話取得エラー:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  // スクロール位置の監視
  useEffect(() => {
    const handleScroll = () => {
      if (!messageContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessageId = `user-${Date.now()}`;
    const newMessage = { id: newMessageId, role: 'user' as const, content: input };
    
    // 新しいメッセージを追加
    const updatedMessagesWithUser = [...messages, newMessage];
    setMessages(updatedMessagesWithUser);
    setInput('');
    setIsLoading(true);

    // 入力後に自動スクロール
    setTimeout(scrollToBottom, 100);

    try {
      // 現在のメッセージ履歴を取得
      const currentMessages = updatedMessagesWithUser.map(msg => ({ 
        role: msg.role as 'user' | 'assistant', 
        content: msg.content 
      }));
      
      // APIリクエスト
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages
        })
      });

      if (!response.ok) {
        throw new Error('メッセージの送信に失敗しました');
      }

      const data = await response.json();
      console.log(data);
      // APIからの応答を処理
      if (data.messages && data.messages.length > 0) {
        const assistantMessage = data.messages[data.messages.length - 1];
        
        // 新しいメッセージ配列を作成
        const updatedMessages = [
          ...updatedMessagesWithUser,
          { 
            id: `assistant-${Date.now()}`, 
            role: 'assistant' as const, 
            content: assistantMessage.content 
          }
        ];
        
        setMessages(updatedMessages);
        
        // ローカルストレージに更新された会話を保存
        localStorage.setItem(`chat-${conversationId}`, JSON.stringify({
          messages: updatedMessages.map(msg => ({ 
            role: msg.role as 'user' | 'assistant', 
            content: msg.content 
          }))
        }));
      }
    } catch (error) {
      console.error('チャットエラー:', error);
      alert('メッセージの送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 日本語入力の変換中はEnterキーを無視する
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-full bg-gradient-to-b from-background to-secondary/10">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b py-3 px-4">
        <h1 className="text-center text-xl font-bold">チャット</h1>
      </div>
      
      <main className="flex-1 flex flex-col relative">
        {isInitialLoading ? (
          <div className="flex flex-col justify-center items-center h-full space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">会話を読み込み中...</p>
          </div>
        ) : (
          <>
            <div 
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-6"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground">
                  <p>会話を始めましょう</p>
                  <p className="text-sm">下のテキストボックスにメッセージを入力してください</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 group ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } animate-in fade-in duration-200`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-9 w-9 bg-primary/20 shrink-0 mt-1 ring-2 ring-background shadow-sm">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`relative p-4 rounded-2xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-none max-w-[80%]'
                            : 'bg-card rounded-tl-none max-w-[90%] border'
                        }`}
                      >
                        <div className="break-words markdown-body overflow-hidden">
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeId = `code-${message.id}-${Math.random().toString(36).substring(2, 9)}`;

                                  return !inline && match ? (
                                    <div className="relative mt-3 mb-3">
                                      <div className="absolute right-2 top-2 z-10 flex space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => copyCodeToClipboard(String(children).replace(/\n$/, ''), codeId)}
                                          className="p-1 rounded-md bg-background/80 text-foreground/80 hover:bg-background transition-colors"
                                          aria-label="コードをコピー"
                                        >
                                          {copiedCode === codeId ? (
                                            <Check className="h-4 w-4" />
                                          ) : (
                                            <Copy className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>
                                      <SyntaxHighlighter
                                        language={match[1]}
                                        style={oneDark}
                                        customStyle={{
                                          margin: 0,
                                          borderRadius: '0.5rem',
                                          fontSize: '0.875rem',
                                        }}
                                        showLineNumbers
                                        wrapLines
                                        wrapLongLines
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre({node, children, ...props}: any) {
                                  return (
                                    <pre className="overflow-auto max-w-full" {...props}>
                                      {children}
                                    </pre>
                                  );
                                },
                                img({node, ...props}: any) {
                                  return (
                                    <img className="max-w-full h-auto rounded-lg my-2" alt="画像" {...props} />
                                  );
                                },
                                table({node, children, ...props}: any) {
                                  return (
                                    <div className="overflow-x-auto max-w-full my-3">
                                      <table className="border-collapse" {...props}>{children}</table>
                                    </div>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        {/* コピーボタン */}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className={`absolute top-2 right-2 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity ${
                            message.role === 'user' ? 'text-primary-foreground/80' : 'text-foreground/80'
                          }`}
                          aria-label="メッセージをコピー"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-9 w-9 bg-secondary shrink-0 mt-1 ring-2 ring-background shadow-sm">
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start animate-pulse max-w-3xl mx-auto w-full">
                  <Avatar className="h-9 w-9 bg-primary/20 shrink-0 mt-1 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card p-4 rounded-2xl rounded-tl-none max-w-[90%] border shadow-sm">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '200ms' }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* スクロールボタン */}
            {showScrollButton && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-20 right-4 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                aria-label="下にスクロール"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
            
            <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t">
              <div className="flex gap-2 items-end max-w-3xl mx-auto w-full">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力... (Shift + Enterで改行)"
                  disabled={isLoading}
                  className="min-h-[60px] max-h-[200px] resize-none border-secondary/50 focus-visible:ring-primary/50 shadow-sm"
                  rows={1}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !input.trim()} 
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0 shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 