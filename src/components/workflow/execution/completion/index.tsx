import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Config } from '@/utils/config';
import { Check, Copy, Loader2, MessageSquare } from "lucide-react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { InputField } from './InputField';
import { useWorkflow } from './hooks/useWorkflow';
import type { InputValues } from './types';

interface CompletionProps {
  workflowId: string;
}

const Completion: React.FC<CompletionProps> = ({ workflowId }) => {
  const router = useRouter();
  const [inputs, setInputs] = useState<InputValues>({});
  const { title, output, isLoading, executeWorkflow, inputSchema } = useWorkflow(workflowId);
  const [renderedOutput, setRenderedOutput] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { data: session } = useSession();
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // 入力値の更新をメモ化
  const handleInputChange = useCallback((name: string, value: string | string[] | File) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  }, []);

  // リスト項目の追加をメモ化
  const handleAddListItem = useCallback((name: string) => {
    setInputs(prev => {
      const currentValues = Array.isArray(prev[name]) ? prev[name] as string[] : [];
      return { ...prev, [name]: [...currentValues, ''] };
    });
  }, []);

  // リスト項目の更新をメモ化
  const handleListItemChange = useCallback((name: string, index: number, value: string) => {
    setInputs(prev => {
      const newValues = [...(prev[name] as string[])];
      newValues[index] = value;
      return { ...prev, [name]: newValues };
    });
  }, []);

  // リスト項目の削除をメモ化
  const handleRemoveListItem = useCallback((name: string, index: number) => {
    setInputs(prev => {
      const newValues = (prev[name] as string[]).filter((_, i) => i !== index);
      return { ...prev, [name]: newValues };
    });
  }, []);

  // list[text]型フィールドの初期化
  useEffect(() => {
    setInputs(prev => {
      const newInputs = { ...prev };
      for (const field of inputSchema) {
        if (field.type === 'list[text]' && !Array.isArray(newInputs[field.name])) {
          newInputs[field.name] = [];
        }
      }
      return newInputs;
    });
  }, [inputSchema]);

  // outputが更新されるたびにマークダウンを再レンダリング
  useEffect(() => {
    if (output) {
      setRenderedOutput(output);
      // 出力が表示されたら自動的にスクロール
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [output]);

  // コピー機能の実装
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(renderedOutput);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleStartChat = async () => {
    if (!renderedOutput || !session?.idToken) return;
    
    try {
      setIsStartingChat(true);
      
      // バックエンドAPIを呼び出して新しい会話を開始
      const response = await fetch(`${Config.NEXT_PUBLIC_API_URL}/conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'assistant', content: renderedOutput }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error('会話の開始に失敗しました');
      }
      
      // 新しい会話IDを生成（タイムスタンプベース）
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // ローカルストレージに会話データを保存
      localStorage.setItem(`chat-${conversationId}`, JSON.stringify({
        messages: [{ role: 'assistant', content: renderedOutput }]
      }));
      
      // チャット画面に遷移
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('チャット開始エラー:', error);
      alert('チャットの開始に失敗しました');
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          {inputSchema.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.description || field.name}
              </Label>
              <InputField
                field={field}
                value={inputs[field.name] || ''}
                onChange={handleInputChange}
                onListItemChange={handleListItemChange}
                onAddListItem={handleAddListItem}
                onRemoveListItem={handleRemoveListItem}
              />
            </div>
          ))}
        </div>
        
        {renderedOutput && (
          <div 
            ref={outputRef}
            className="relative mt-8 pt-6 border-t border-border/50"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">出力結果</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>コピー済み</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>コピー</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartChat}
                  disabled={isStartingChat}
                  className="flex items-center gap-1"
                >
                  {isStartingChat ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>準備中...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      <span>チャットで続ける</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="bg-secondary/20 rounded-lg p-4 overflow-auto max-h-[500px] markdown-body">
              <ReactMarkdown
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeId = `code-${Math.random().toString(36).substring(2, 9)}`;
                    
                    return !inline && match ? (
                      <div className="relative">
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
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                          }}
                          showLineNumbers
                          wrapLines
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {renderedOutput}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 bg-secondary/5">
        <Button 
          onClick={() => executeWorkflow(inputs)}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>実行中...</span>
            </div>
          ) : (
            <span>実行</span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Completion;
