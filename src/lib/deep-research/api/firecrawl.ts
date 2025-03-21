import FirecrawlApp from '@mendable/firecrawl-js';
import type { SearchResult } from '../types';

/**
 * Firecrawlクライアントのセットアップ
 * @param apiKey Firecrawl API Key
 * @returns セットアップされたFirecrawlクライアント
 */
export function setupFirecrawl(apiKey: string): FirecrawlApp {
  console.log('Using Firecrawl API key:', apiKey ? 'Key exists' : 'No key provided');
  return new FirecrawlApp({ apiKey });
}

interface SearchResponse {
  results: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
}

/**
 * Web検索を実行する
 * @param client Firecrawlクライアント
 * @param query 検索クエリ
 * @returns 検索結果の配列
 */
export async function searchWeb(client: FirecrawlApp, query: string): Promise<SearchResult[]> {
  try {
    const response = await client.search(query) as unknown as SearchResponse;
    const results = response.results || [];
    
    return results.map((result) => ({
      url: result.url || '',
      title: result.title || '',
      snippet: result.snippet || ''
    }));
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

interface WebContentResponse {
  title?: string;
  text?: string;
}

/**
 * WebページのコンテンツをFetch
 * @param client Firecrawlクライアント
 * @param url ページURL
 * @returns タイトルとテキストコンテンツ
 */
export async function fetchWebContent(client: FirecrawlApp, url: string): Promise<{ title: string, text: string } | null> {
  try {
    const result = await client.scrapeUrl(url) as unknown as WebContentResponse;
    if (!result || !result.text) {
      console.log(`No content retrieved for URL: ${url}`);
      return null;
    }
    return {
      title: result.title || '',
      text: result.text
    };
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    throw error;
  }
} 