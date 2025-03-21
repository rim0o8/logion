import { useDeepResearch as useLibDeepResearch } from '@/lib/deep-research';
import type { ResearchParams } from '../utils/api';

// 型の互換性のために変換関数を作成
const convertParams = (params: ResearchParams) => {
  return {
    query: params.query,
    depth: params.depth,
    breadth: params.breadth,
    model: params.model,
    searchProvider: 'firecrawl' as const, // firecrawlを使用
  };
};

/**
 * @deprecated 共通フックを使用してください。このフックは後で削除されます。
 */
export const useDeepResearch = () => {
  const libHook = useLibDeepResearch();
  
  // ラッパー関数を作成してAPIの互換性を維持
  const startResearch = async (params: ResearchParams) => {
    return libHook.startResearch(convertParams(params));
  };
  
  return {
    ...libHook,
    startResearch,
  };
}; 