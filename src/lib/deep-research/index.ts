import { runResearch } from "./buildGraph";
import type { ResearchState, Section } from "./state";
import { formatCompletedSections } from "./textUtils";

export type {
  ResearchState,
  Section
};

/**
 * 深層研究を実行する
 * 
 * @param options - 研究オプション
 * @returns 研究結果
 */
export async function executeDeepResearch(options: {
  topic: string;
  planModel?: string;
  planModelProvider?: string;
  queryModel?: string;
  queryModelProvider?: string;
  writeModel?: string;
  writeModelProvider?: string;
}) {
  // デフォルト値の設定
  const initialState: ResearchState = {
    topic: options.topic,
    planModel: options.planModel || "gpt-4o",
    planModelProvider: options.planModelProvider || "openai",
    queryModel: options.queryModel,
    queryModelProvider: options.queryModelProvider,
    writeModel: options.writeModel,
    writeModelProvider: options.writeModelProvider,
    sections: [],
    currentStep: "start",
  };
  
  // 研究を実行
  const result = await runResearch(initialState);
  
  return {
    success: !result.error,
    error: result.error,
    report: result.finalReport,
    sections: result.completedSections || [],
  };
}

/**
 * マークダウン形式でレポートをフォーマットする
 * 
 * @param sections - フォーマットするセクション
 * @returns フォーマットされたレポート
 */
export function formatReport(sections: Section[]): string {
  return formatCompletedSections(sections);
}

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