"use client";

import { cn } from "@/lib/utils";
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/cjs/languages/prism/css';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
// 言語のサポートを追加
import jsx from 'react-syntax-highlighter/dist/cjs/languages/prism/jsx';
import html from 'react-syntax-highlighter/dist/cjs/languages/prism/markup';
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
SyntaxHighlighter.registerLanguage('html', html);

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code({ className, children, ...props }) {
            // インラインコードの場合はそのまま返す
            if (!className) {
              return <code {...props}>{children}</code>;
            }
            
            // language-xxxx から言語を抽出
            const match = /language-(\w+)/.exec(className);
            const language = match ? match[1] : '';
            
            return (
              <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: '1em 0',
                  borderRadius: '0.5rem',
                  padding: '1em',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          // テーブルのスタイルを改善
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
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
              >
                {children}
              </a>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 