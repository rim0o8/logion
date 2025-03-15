import type { InputSchema, InputValues } from '@/components/workflow/execution/completion/types';
import { Config } from '@/utils/config';
import { useSession } from "next-auth/react";
import { useEffect, useState } from 'react';

export const useWorkflow = (workflowId: string) => {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputSchema, setInputSchema] = useState<InputSchema[]>([]);

  // スキーマの取得
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const apiUrl = `${Config.NEXT_PUBLIC_API_URL}/workflow/${workflowId}`;
        console.log(apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session?.idToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setTitle(data.title);
        setInputSchema(data.input_schema);
      } catch (error) {
        console.error('スキーマ取得エラー:', error);
      }
    };
    if (status === 'authenticated') {
      fetchSchema();
    }
  }, [workflowId, session, status]);

  const executeWorkflow = async (inputs: InputValues) => {
    try {
      setIsLoading(true);
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/workflow/${workflowId}`;

      let body: FormData | string;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session?.idToken}`,
      };

      // ファイルデータが含まれているかを判定
      const hasFileData = Object.values(inputs).some(value => value instanceof File);

      if (hasFileData) {
        // multipart/form-dataを使用
        const formData = new FormData();
        for (const [key, value] of Object.entries(inputs)) {
          if (value instanceof File) {
            formData.append(key, value);
          } else if (Array.isArray(value)) {
            for (const v of value) {
              formData.append(key, v);
            }
          } else {
            formData.append(key, String(value));
          }
        }
        body = formData;
        // Content-Typeは自動的に設定されるため、明示的に設定しない
      } else {
        // application/jsonを使用
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(inputs);
      }
      headers.Accept = 'text/event-stream';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('レスポンスボディが空です');

      setOutput('');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput(prev => prev + new TextDecoder().decode(value));
      }
    } catch (error) {
      console.error('APIリクエストエラー:', error);
      setOutput(`エラーが発生しました: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return { title, output, isLoading, executeWorkflow, inputSchema };
};