import { useCallback, useRef, useState } from 'react';
import type { ResearchParams } from '../utils/api';
import { DeepResearchEngine } from '../utils/research-engine';

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
  
  // Use ref to track last progress to prevent it from decreasing
  const lastProgressRef = useRef(0);

  const startResearch = useCallback(async (params: ResearchParams) => {
    // リサーチ開始前に状態をリセット
    setState({
      isResearching: true,
      progress: 0,
      progressMessage: 'リサーチを準備しています...',
      result: null,
      error: null,
    });
    
    // Reset progress tracker
    lastProgressRef.current = 0;

    try {
      // 進捗状況を更新するためのコールバック
      const onProgress = (message: string, progress: number) => {
        // Ensure progress never goes backwards (unless explicitly reset to 0)
        if (progress === 0 || progress >= lastProgressRef.current) {
          lastProgressRef.current = progress;
          setState(prev => ({
            ...prev,
            progress,
            progressMessage: message,
          }));
        } else {
          console.warn('Ignoring decreasing progress value:', progress, 'current:', lastProgressRef.current);
        }
      };

      // DeepResearchEngineのインスタンスを作成して実行
      const engine = new DeepResearchEngine(params, onProgress);
      const result = await engine.run();

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
    
    // Reset progress tracker
    lastProgressRef.current = 0;
  }, []);

  return {
    ...state,
    startResearch,
    cancelResearch,
  };
}; 