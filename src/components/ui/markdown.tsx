"use client";

import { cn } from "@/lib/utils";
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

// 言語のサポートを追加
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/cjs/languages/prism/css';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/cjs/languages/prism/jsx';
import mermaid from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/cjs/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';

// 言語を登録
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('mermaid', mermaid);

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [mermaidSvg, setMermaidSvg] = useState<Record<string, string>>({});

  // Mermaidダイアグラムをレンダリング
  useEffect(() => {
    const renderMermaid = async () => {
      if (typeof window !== 'undefined') {
        try {
          const mermaidModule = await import('mermaid');
          const { default: mermaid } = mermaidModule;

          mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'sans-serif',
            flowchart: {
              curve: 'basis',
              htmlLabels: true,
            },
            themeVariables: {
              primaryColor: isDark ? '#3b82f6' : '#60a5fa',
              primaryTextColor: isDark ? '#f3f4f6' : '#1f2937',
              primaryBorderColor: isDark ? '#4b5563' : '#d1d5db',
              lineColor: isDark ? '#6b7280' : '#9ca3af',
              secondaryColor: isDark ? '#4b5563' : '#e5e7eb',
              tertiaryColor: isDark ? '#1f2937' : '#f9fafb',
            }
          });

          // コンテンツからMermaidコードブロックを抽出
          const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
          let match: RegExpExecArray | null;
          const newMermaidSvg: Record<string, string> = {};
          
          while ((match = mermaidRegex.exec(content)) !== null) {
            const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
            const code = match[1].trim();
            
            try {
              const { svg } = await mermaid.render(id, code);
              newMermaidSvg[code] = svg;
            } catch (error) {
              console.error('Mermaid rendering error:', error);
              newMermaidSvg[code] = `<div class="text-red-500 p-4 border border-red-300 rounded">Mermaid diagram rendering error</div>`;
            }
          }
          
          setMermaidSvg(newMermaidSvg);
        } catch (error) {
          console.error('Failed to load mermaid:', error);
        }
      }
    };

    renderMermaid();
  }, [content, isDark]);

  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code({ className, children, ...props }) {
            // インラインコードの場合はそのまま返す
            if (!className) {
              return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
            }
            
            // language-xxxx から言語を抽出
            const match = /language-(\w+)/.exec(className);
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            
            // Mermaidダイアグラムの場合
            if (language === 'mermaid' && mermaidSvg[codeContent]) {
              // eslint-disable-next-line react/no-danger
              return (
                <div className="my-4 rounded-lg overflow-hidden">
                  <div 
                    dangerouslySetInnerHTML={{ __html: mermaidSvg[codeContent] }} 
                    className="flex justify-center bg-white dark:bg-gray-900"
                  />
                </div>
              );
            }

            return (
              <div className="my-4 overflow-hidden rounded-lg">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-xs text-white">
                  <span className="font-mono font-medium">{language.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(codeContent);
                    }}
                    className="text-white/80 hover:text-white transition-colors duration-200"
                  >
                    Copy
                  </button>
                </div>
                <SyntaxHighlighter
                  style={isDark ? vscDarkPlus : vs}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    padding: '1rem',
                    backgroundColor: isDark ? '#1a1b26' : '#f8f9fc',
                  }}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            );
          },
          // テーブルのスタイルを改善
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="border-collapse w-full">{children}</table>
              </div>
            );
          },
          // リンクを新しいタブで開く
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            );
          },
          // 見出しのスタイルを改善
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
          },
          // リストのスタイルを改善
          ul({ children }) {
            return <ul className="list-disc pl-6 my-4">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 my-4">{children}</ol>;
          },
          // 引用のスタイルを改善
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-4 italic text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 