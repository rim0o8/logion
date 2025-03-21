'use client';

import { useState } from 'react';
import type { ResearchParams } from '../utils/api';
import { DeepResearchForm } from './DeepResearchForm';
import { ProgressBar } from './ProgressBar';
import { ResearchResult } from './ResearchResult';

export const DeepResearchPage = () => {
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ResearchParams) => {
    try {
      setIsResearching(true);
      setProgress(0);
      setProgressMessage('リクエストを送信中...');
      setResult(null);
      setError(null);

      // サーバーサイドのAPIエンドポイントを呼び出す
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'リサーチの実行に失敗しました');
      }

      const { report, progressLog } = await response.json();

      // 進捗ログを処理して最終結果を表示
      if (progressLog && progressLog.length > 0) {
        const lastProgress = progressLog[progressLog.length - 1];
        setProgressMessage(lastProgress.message);
        setProgress(lastProgress.progress);
      }

      setResult(report);
    } catch (error) {
      console.error('リサーチエラー:', error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">AI ディープリサーチ</h1>
        
        <DeepResearchForm onSubmit={handleSubmit} isResearching={isResearching} />
        
        {isResearching && (
          <div className="mt-8">
            <ProgressBar progress={progress} />
            <p className="text-center mt-2">{progressMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-8 p-4 border border-red-300 bg-red-50 rounded-md text-red-700">
            <p className="font-semibold">エラーが発生しました:</p>
            <p>{error}</p>
          </div>
        )}
        
        {result && <ResearchResult result={result} />}
      </div>
    </div>
  );
}; 