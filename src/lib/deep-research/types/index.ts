import * as z from 'zod';

// Search result type
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Web content type
export interface WebContent {
  title: string;
  text: string;
}

// Research parameters schema definition
export const ResearchParamsSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  depth: z.number().int().min(1).max(5),
  breadth: z.number().int().min(1).max(10),
  model: z.string().min(1, 'Model is required'),
  searchProvider: z.enum(['firecrawl', 'tavily']).default('firecrawl'),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  firecrawlApiKey: z.string().optional(),
  tavilyApiKey: z.string().optional(),
});

export type ResearchParams = z.infer<typeof ResearchParamsSchema>;

// Client-side schema definition (excludes API key fields)
export const ClientResearchParamsSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  depth: z.number().int().min(1).max(5),
  breadth: z.number().int().min(1).max(10),
  model: z.string().min(1, 'Model is required'),
  searchProvider: z.enum(['firecrawl', 'tavily']).default('firecrawl'),
});

export type ClientResearchParams = z.infer<typeof ClientResearchParamsSchema>;

// Analysis result type
export interface AnalysisResult {
  url: string;
  title: string;
  analysis: string;
}

// Research response type
export interface ResearchResponse {
  success: boolean;
  report: string;
  progressLog: { message: string; progress: number }[];
}

// Error response type
export interface ResearchErrorResponse {
  error: string;
  message: string;
  details?: unknown;
} 