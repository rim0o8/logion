'use client';

import { DeepResearchForm } from '@/features/deep-research/components/DeepResearchForm';
import { ResearchProgress } from '@/features/deep-research/components/ResearchProgress';
import { ResearchResult } from '@/features/deep-research/components/ResearchResult';
import type { ClientResearchParams } from '@/lib/deep-research';
import { useDeepResearch } from '@/lib/deep-research';

export default function DeepResearchPage() {
  const { 
    isResearching, 
    progress, 
    progressMessage, 
    result, 
    error, 
    startResearch, 
    cancelResearch 
  } = useDeepResearch();

  const handleSubmit = async (data: ClientResearchParams) => {
    await startResearch(data);
  };

  const handleStartNewSearch = () => {
    // リサーチをリセットして最初から始める
    cancelResearch();
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">ディープリサーチ</h1>
      
      <p className="mb-8 text-muted-foreground">
        OpenAIとFirecrawl APIを使用して、任意のトピックについての包括的なリサーチを実行します。
        AIがWeb検索、コンテンツ分析、そして深い洞察を行い、詳細なレポートを生成します。
      </p>

      {!isResearching && !result && !error && (
        <DeepResearchForm 
          onSubmit={handleSubmit} 
          formState={{ isResearching }} 
        />
      )}

      {isResearching && (
        <ResearchProgress
          progress={progress}
          message={progressMessage}
          onCancel={cancelResearch}
        />
      )}

      {!isResearching && result && (
        <ResearchResult
          result={result}
          // @ts-ignore ResearchResult component needs to be updated to include onNewSearch
          onNewSearch={handleStartNewSearch}
        />
      )}

      {!isResearching && error && (
        <div className="bg-destructive/10 p-4 rounded-md border border-destructive">
          <h2 className="text-xl font-semibold mb-2 text-destructive">エラーが発生しました</h2>
          <p className="text-destructive-foreground">{error}</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleStartNewSearch}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              もう一度試す
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 