import FirecrawlApp from '@mendable/firecrawl-js';
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

// Firecrawlクライアントの設定
export function setupFirecrawl(apiKey?: string) {
  // APIキーが指定されていない場合は環境変数から取得
  const key = apiKey || process.env.FIRECRAWL_API_KEY || '';
  
  console.log('Firecrawl APIキーを使用:', key ? 'キーが存在します' : 'キーが存在しません');
  
  if (!key) {
    throw new Error('Firecrawl APIキーがサーバー環境に設定されていません。サーバー管理者に連絡してください。');
  }

  return new FirecrawlApp({ apiKey: key });
}

// 検索結果のアイテム型
interface SearchResponseItem {
  title?: string;
  url?: string;
  snippet?: string;
}

interface SearchResponse {
  results?: SearchResponseItem[];
  [key: string]: unknown;
}

// Web検索の実行
export async function searchWeb(firecrawl: FirecrawlApp, query: string): Promise<SearchResult[]> {
  try {
    const response = await firecrawl.search(query) as unknown as SearchResponse;
    const results = response.results || [];
    
    return results.map((result) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.snippet || '',
    }));
  } catch (error) {
    console.error('検索エラー:', error);
    return [];
  }
}

// Webページのコンテンツ型
interface RawWebContent {
  title?: string;
  text?: string;
  [key: string]: unknown;
}

// Webページのコンテンツ取得
export async function fetchWebContent(firecrawl: FirecrawlApp, url: string): Promise<WebContent | null> {
  try {
    // firecrawlの正しいメソッド名に修正
    const content = await firecrawl.scrapeUrl(url) as unknown as RawWebContent;
    if (!content || !content.text) {
      return null;
    }
    return {
      title: content.title || '',
      text: content.text,
    };
  } catch (error) {
    console.error('コンテンツ取得エラー:', error);
    return null;
  }
} 