// Deep Research モジュールのエクスポート
export * from './configuration';
export * from './graph';
export * from './state';
export * from './utils';

// クライアント側で使用するためのリサーチパラメータインターフェース
export interface ClientResearchParams {
  topic: string;
  model: string;
  provider: string;
  maxSearchDepth?: number;
  numberOfQueries?: number;
  searchApi?: string;
  instructions?: string;
  customPrompts?: {
    plannerPrompt?: string;
    sectionPrompt?: string;
    finalPrompt?: string;
  };
} 