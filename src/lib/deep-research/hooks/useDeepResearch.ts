import { useCallback, useState } from 'react';
import { executeDeepResearch } from '../api/client';
import type { ClientResearchParams } from '../types';

interface ResearchState {
  isResearching: boolean;
  progress: number;
  progressMessage: string;
  result: string | null;
  error: string | null;
}

export const useDeepResearch = () => {
  const [state, setState] = useState<ResearchState>({
    isResearching: false,
    progress: 0,
    progressMessage: '',
    result: null,
    error: null,
  });

  const startResearch = useCallback(async (params: ClientResearchParams) => {
    // リサーチ開始前に状態をリセット
    setState({
      isResearching: true,
      progress: 0,
      progressMessage: 'リサーチを準備しています...',
      result: null,
      error: null,
    });

    try {
      // 進捗状況を更新するためのコールバック
      const onProgress = (message: string, progress: number) => {
        setState(prev => ({
          ...prev,
          progress,
          progressMessage: message,
        }));
      };

      // ディープリサーチAPIを呼び出し
      const result = await executeDeepResearch(params, onProgress);

      // 成功した結果を設定
      setState(prev => ({
        ...prev,
        isResearching: false,
        progress: 100,
        progressMessage: 'リサーチが完了しました',
        result,
      }));

      return result;
    } catch (error) {
      // エラーが発生した場合
      console.error('リサーチ中にエラーが発生しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      
      setState(prev => ({
        ...prev,
        isResearching: false,
        error: errorMessage,
      }));

      return null;
    }
  }, []);

  const cancelResearch = useCallback(() => {
    // 現在のところキャンセルの実装は簡単ではないため、
    // 単に状態をリセットします
    setState({
      isResearching: false,
      progress: 0,
      progressMessage: '',
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    startResearch,
    cancelResearch,
  };
}; 