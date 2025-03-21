import { tavily } from '@tavily/core';
import type { SearchResult, WebContent } from '../types';
import { logDebug } from '../utils/logger';

// Tavilyクライアントの型定義
interface TavilySearchResult {
  title?: string;
  url: string;
  content?: string;
}

interface TavilyExtractResult {
  url: string;
  metadata?: {
    title?: string;
  };
  rawContent?: string;
}

interface TavilyClient {
  search: (query: string, options?: object) => Promise<{
    results: TavilySearchResult[];
  }>;
  extract: (urls: string[], options?: object) => Promise<{
    results: TavilyExtractResult[];
    failedResults?: Array<{ url: string; error: string }>;
  }>;
}

// Tavily検索の実行
export async function searchWebWithTavily(tavilyClient: TavilyClient, query: string): Promise<SearchResult[]> {
  try {
    logDebug('SearchWebWithTavily', 'Executing search', { query });
    
    // Tavilyの検索APIを呼び出す
    const response = await tavilyClient.search(query, {
      search_depth: 'advanced', // より詳細な検索
      include_answer: false, // 回答は不要、検索結果のみ必要
      include_domains: [],
      exclude_domains: [],
      max_results: 10,
    });
    
    // Tavilyのレスポンスをアプリケーションの標準形式に変換
    const searchResults: SearchResult[] = response.results.map(result => ({
      title: result.title || 'Untitled',
      url: result.url,
      snippet: result.content || 'No description available',
    }));
    
    logDebug('SearchWebWithTavily', 'Search results received', { 
      count: searchResults.length,
      sampleUrls: searchResults.slice(0, 3).map(r => r.url)
    });
    
    return searchResults;
  } catch (error) {
    logDebug('SearchWebWithTavily', 'Error searching with Tavily', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

// Tavilyを使用してWebコンテンツを取得
export async function fetchWebContentWithTavily(tavilyClient: TavilyClient, url: string): Promise<WebContent | null> {
  try {
    logDebug('FetchWebContentWithTavily', 'Fetching content', { url });
    
    // Tavilyの抽出APIを呼び出す
    const response = await tavilyClient.extract([url], {
      max_retries: 1,
    });
    
    if (!response.results || response.results.length === 0) {
      logDebug('FetchWebContentWithTavily', 'No content found', { url });
      return null;
    }
    
    const result = response.results[0];
    
    // Tavilyのレスポンス構造に合わせて安全にアクセス
    const webContent: WebContent = {
      title: result.metadata?.title || 'Untitled',
      text: result.rawContent || 'No content available',
    };
    
    logDebug('FetchWebContentWithTavily', 'Content fetched successfully', {
      url,
      titleLength: webContent.title.length,
      textLength: webContent.text.length,
    });
    
    return webContent;
  } catch (error) {
    logDebug('FetchWebContentWithTavily', 'Error fetching content with Tavily', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

// Tavilyクライアントのセットアップ
export function setupTavily(apiKey: string): TavilyClient {
  logDebug('SetupTavily', 'Initializing Tavily client');
  return tavily({ apiKey }) as TavilyClient;
} 