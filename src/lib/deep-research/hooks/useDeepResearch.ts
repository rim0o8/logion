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
    // Reset state before starting research
    setState({
      isResearching: true,
      progress: 0,
      progressMessage: 'Preparing research...',
      result: null,
      error: null,
    });

    try {
      // Callback to update progress
      const onProgress = (message: string, progress: number) => {
        setState(prev => ({
          ...prev,
          progress,
          progressMessage: message,
        }));
      };

      // Call deep research API
      const result = await executeDeepResearch(params, onProgress);

      // Set successful result
      setState(prev => ({
        ...prev,
        isResearching: false,
        progress: 100,
        progressMessage: 'Research completed',
        result,
      }));

      return result;
    } catch (error) {
      // Handle errors
      console.error('Error during research:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isResearching: false,
        error: errorMessage,
      }));

      return null;
    }
  }, []);

  const cancelResearch = useCallback(() => {
    // Currently cancellation is not easy to implement,
    // so we just reset the state
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