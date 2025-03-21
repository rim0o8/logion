import * as z from 'zod';

// 検索結果の型
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Webコンテンツの型
export interface WebContent {
  title: string;
  text: string;
}

// リサーチパラメータのスキーマ定義
export const ResearchParamsSchema = z.object({
  query: z.string().min(1, 'クエリを入力してください'),
  depth: z.number().int().min(1).max(5),
  breadth: z.number().int().min(1).max(10),
  model: z.string().min(1, 'モデルを指定してください'),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  firecrawlApiKey: z.string().optional(),
});

export type ResearchParams = z.infer<typeof ResearchParamsSchema>;

// クライアント側用のスキーマ定義（APIキーフィールドを除外）
export const ClientResearchParamsSchema = z.object({
  query: z.string().min(1, 'クエリを入力してください'),
  depth: z.number().int().min(1).max(5),
  breadth: z.number().int().min(1).max(10),
  model: z.string().min(1, 'モデルを指定してください'),
});

export type ClientResearchParams = z.infer<typeof ClientResearchParamsSchema>;

// 分析結果の型定義
export interface AnalysisResult {
  url: string;
  title: string;
  analysis: string;
}

// リサーチ結果のレスポンス型
export interface ResearchResponse {
  success: boolean;
  report: string;
  progressLog: { message: string; progress: number }[];
}

// エラーレスポンスの型
export interface ResearchErrorResponse {
  error: string;
  message: string;
  details?: unknown;
} 