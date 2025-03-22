import axios from 'axios';
import { SearchAPI, type SearchApiConfigOptions } from './configuration';
import type { Section } from './state';

/**
 * 設定値を取得するヘルパー関数
 * @param value 設定値（文字列またはenum）
 * @returns 文字列の設定値
 */
export function getConfigValue(value: string | SearchAPI): string {
  return typeof value === 'string' ? value : String(value);
}

/**
 * 指定された検索APIに受け入れられるパラメータでのみ検索API設定をフィルタリング
 * @param searchApi 検索API識別子
 * @param searchApiConfig 検索API設定
 * @returns 検索関数に渡すパラメータの辞書
 */
export function getSearchParams(
  searchApi: string,
  searchApiConfig?: SearchApiConfigOptions
): Record<string, unknown> {
  if (!searchApiConfig) return {};

  // 各検索APIで受け入れられるパラメータを定義
  const SEARCH_API_PARAMS: Record<string, string[]> = {
    'exa': [
      'maxCharacters',
      'numResults',
      'includeDomains',
      'excludeDomains',
      'subpages',
    ],
    'tavily': [], // Tavilyは現在追加パラメータを受け付けない
    'perplexity': [], // Perplexityは追加パラメータを受け付けない
    'arxiv': ['loadMaxDocs', 'getFullDocuments', 'loadAllAvailableMeta'],
    'pubmed': ['topKResults', 'email', 'apiKey', 'docContentCharsMax'],
    'linkup': ['depth'],
  };

  // 指定された検索APIで受け入れられるパラメータのリストを取得
  const acceptedParams = SEARCH_API_PARAMS[searchApi] || [];

  // 受け入れられるパラメータでフィルタリングした設定を返す
  const filteredConfig: Record<string, unknown> = {};
  for (const key of acceptedParams) {
    const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    const paramValue = searchApiConfig[key as keyof SearchApiConfigOptions];
    if (paramValue !== undefined) {
      filteredConfig[snakeCaseKey] = paramValue;
    }
  }

  return filteredConfig;
}

/**
 * 検索プロバイダを選択して検索を実行
 * @param searchApi 使用する検索API
 * @param query 検索クエリ
 * @param searchApiConfig 検索設定オプション
 * @returns 検索結果
 */
export async function selectAndExecuteSearch(
  searchApi: string,
  query: string | string[],
  searchApiConfig?: SearchApiConfigOptions
): Promise<SearchResult[]> {
  // 環境変数からSEARCH_APIを確認
  const envSearchApi = process.env.SEARCH_API;
  const effectiveSearchApi = envSearchApi || searchApi;
  
  if (envSearchApi) {
    console.log(`環境変数からSEARCH_APIを使用: ${envSearchApi}`);
  }
  
  console.log(`検索実行: API=${effectiveSearchApi}, クエリ="${query}"`);
  
  const params = getSearchParams(effectiveSearchApi, searchApiConfig);
  
  // 文字列配列の場合は最初のクエリのみを使用
  const effectiveQuery = Array.isArray(query) ? query[0] : query;
  
  switch (effectiveSearchApi) {
    case SearchAPI.TAVILY:
      return await searchWithTavily(effectiveQuery, params);
    case SearchAPI.EXA:
      return await searchWithExa(effectiveQuery, params);
    case SearchAPI.PERPLEXITY:
      return await searchWithPerplexity(effectiveQuery);
    case SearchAPI.DUCKDUCKGO:
      return await searchWithDuckDuckGo(effectiveQuery, params);
    case SearchAPI.ARXIV:
      return await searchWithArxiv(effectiveQuery, params);
    case SearchAPI.PUBMED:
      return await searchWithPubMed(effectiveQuery, params);
    case SearchAPI.LINKUP:
      return await searchWithLinkup(effectiveQuery, params);
    case SearchAPI.GOOGLESEARCH:
      return await searchWithGoogleSearch(effectiveQuery, params);
    default:
      throw new Error(`サポートされていない検索API: ${effectiveSearchApi}`);
  }
}

/**
 * 検索結果のインターフェース
 */
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * 外部検索プロバイダからのレスポンスを標準形式に変換するヘルパー関数
 * @param results 外部プロバイダからの検索結果
 * @returns 標準化された検索結果
 */
export function normalizeSearchResults(results: Record<string, unknown>[]): SearchResult[] {
  return results.map(result => ({
    title: (result.title as string) || 'タイトルなし',
    url: (result.url as string) || '',
    content: (result.content as string) || (result.snippet as string) || (result.text as string) || '',
    metadata: (result.metadata as Record<string, unknown>) || {},
  }));
}

/**
 * Tavily検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithTavily(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`Tavilyで検索: "${query}"`);
  
  if (!query || query.trim() === "") {
    console.error("Tavily検索エラー: 空のクエリが指定されました");
    return [];
  }
  
  try {
    
    // // デバッグ用にモックデータを返す
    // console.log("Tavily APIの代わりにモックデータを使用します");
    
    // // テスト用のモックデータ
    // const mockResults = [
    //   {
    //     title: `${query}に関する情報 - Wikipedia`,
    //     url: "https://ja.wikipedia.org/wiki/example",
    //     content: `${query}は現代社会で重要な役割を果たしています。${query}の主な応用例としては、医療分野、教育分野、ビジネス分野などが挙げられます。特に人工知能と組み合わせることで、より効果的な結果が得られることが研究により明らかになっています。`,
    //     metadata: {
    //       score: 0.95,
    //       year: 2024,
    //       published_date: "2024-03-01",
    //       source: "tavily"
    //     }
    //   },
    //   {
    //     title: `${query}の最新動向 - 技術ブログ`,
    //     url: "https://example.com/tech-blog",
    //     content: `近年の${query}の発展は目覚ましく、特に以下の分野で注目されています：\n1. 自然言語処理\n2. コンピュータビジョン\n3. 予測分析\n4. 自動化システム\nこれらの技術は日々進化しており、私たちの生活をより便利にしています。`,
    //     metadata: {
    //       score: 0.88,
    //       year: 2024,
    //       published_date: "2024-02-15",
    //       source: "tavily"
    //     }
    //   },
    //   {
    //     title: `${query}と未来社会 - 研究論文`,
    //     url: "https://example.org/research-paper",
    //     content: `本研究では、${query}が将来の社会に与える影響について分析しました。研究結果によると、${query}の普及により、労働市場、教育システム、医療サービスに大きな変革がもたらされる可能性があります。特に注目すべきは、${query}によって新たな職業が創出される一方で、一部の従来型の仕事は自動化されることが予測されています。`,
    //     metadata: {
    //       score: 0.82,
    //       year: 2023,
    //       published_date: "2023-11-30",
    //       source: "tavily"
    //     }
    //   }
    // ];
    
    // return normalizeSearchResults(mockResults);
    
    
    // 本番用のTavily API呼び出し
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.error("Tavily API キーが設定されていません");
      throw new Error("TAVILY_API_KEYが設定されていません");
    }

    console.log(`Tavily API リクエスト送信中... クエリ: "${query}"`);
    console.log('Tavily API パラメータ:', JSON.stringify(params, null, 2));
    
    const requestBody = {
      api_key: apiKey,
      query: query,
      search_depth: "advanced",
      include_domains: params.include_domains || [],
      exclude_domains: params.exclude_domains || [],
      max_results: params.max_results || 10,
      include_answer: true,
      include_raw_content: false,
    };

    console.log('Tavily API リクエスト本文:', JSON.stringify({
      ...requestBody,
      api_key: "API_KEY_REDACTED" // APIキーをログに出力しない
    }, null, 2));

    // axiosを使用してリクエストを送信
    const response = await axios.post("https://api.tavily.com/search", requestBody);

    // ステータスコードとレスポンスをログに出力
    console.log(`Tavily API レスポンス: ステータス ${response.status}`);
    
    // データがない場合は空の配列を返す
    if (!response.data) {
      console.error("Tavily API エラー: レスポンスデータがありません");
      return [];
    }

    const data = response.data;
    const results = data.results || [];
    
    // 結果の数をログに出力
    console.log(`Tavily 検索結果: ${results.length}件取得しました`);
    
    if (results.length === 0) {
      console.log("Tavily検索結果: 結果が見つかりませんでした");
      return [];
    }
    
    // 最初の結果をログに出力（デバッグ用）
    if (results.length > 0) {
      console.log("Tavily 最初の結果サンプル:", {
        title: results[0].title || "(タイトルなし)",
        url: results[0].url || "(URLなし)",
        contentLength: (results[0].content || "").length
      });
    }
    
    // 検索結果を標準形式に変換
    const normalizedResults = normalizeSearchResults(results.map((result: Record<string, unknown>) => ({
      title: result.title as string || "タイトルなし",
      url: result.url as string || "",
      content: (result.content as string) || (result.snippet as string),
      metadata: {
        score: result.score as number,
        year: result.year as number,
        published_date: result.published_date as string,
        source: "tavily"
      }
    })));
    
    console.log(`Tavily 正規化後の結果: ${normalizedResults.length}件`);
    console.log(normalizedResults);
    return normalizedResults;
  } catch (error) {
    console.error('Tavily検索エラー:', error);
    
    // エラーの詳細情報を出力
    if (axios.isAxiosError(error)) {
      console.error('Tavily API レスポンスエラー詳細:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    
    return [];
  }
}

/**
 * Exa検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithExa(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`Exaで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のAPIを呼び出す
    const mockResults = [
      {
        title: `Exa検索結果: ${query}`,
        url: 'https://example.com/exa/result1',
        content: `これは「${query}」に関するExa検索結果のサンプルコンテンツです。`,
      },
      {
        title: `Exa検索結果2: ${query}`,
        url: 'https://example.com/exa/result2',
        content: `これは「${query}」に関するExa検索の別の結果です。`,
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('Exa検索エラー:', error);
    return [];
  }
}

/**
 * Perplexity検索API
 * @param query 検索クエリ
 * @returns 検索結果
 */
async function searchWithPerplexity(query: string): Promise<SearchResult[]> {
  console.log(`Perplexityで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のAPIを呼び出す
    const mockResults = [
      {
        title: `Perplexity検索結果: ${query}`,
        url: 'https://example.com/perplexity/result1',
        content: `これは「${query}」に関するPerplexity検索結果のサンプルコンテンツです。`,
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('Perplexity検索エラー:', error);
    return [];
  }
}

/**
 * DuckDuckGo検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithDuckDuckGo(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`DuckDuckGoで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では実際のDDG APIを使用
    const mockResults = [
      {
        title: `DuckDuckGo検索結果: ${query}`,
        url: 'https://example.com/ddg/result1',
        content: `これは「${query}」に関するDuckDuckGo検索結果のサンプルです。`,
      },
      {
        title: `DuckDuckGo検索結果2: ${query}`,
        url: 'https://example.com/ddg/result2',
        content: `これは「${query}」に関するDuckDuckGoの別の結果です。`,
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('DuckDuckGo検索エラー:', error);
    return [];
  }
}

/**
 * arXiv検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithArxiv(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`arXivで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のarXiv APIを使用
    const mockResults = [
      {
        title: `arXiv論文: ${query}に関する研究`,
        url: 'https://arxiv.org/abs/mock.12345',
        content: `これは「${query}」に関する学術論文のサンプル抄録です。`,
        metadata: {
          authors: ['研究者 A', '研究者 B'],
          year: 2023,
          citations: 42,
        },
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('arXiv検索エラー:', error);
    return [];
  }
}

/**
 * PubMed検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithPubMed(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`PubMedで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のPubMed APIを使用
    const mockResults = [
      {
        title: `医学論文: ${query}に関する臨床研究`,
        url: 'https://pubmed.ncbi.nlm.nih.gov/mock12345/',
        content: `これは「${query}」に関する医学論文のサンプル抄録です。`,
        metadata: {
          authors: ['医師 A', '研究者 B'],
          journal: 'Journal of Medical Research',
          year: 2023,
          pmid: 'PMID12345',
        },
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('PubMed検索エラー:', error);
    return [];
  }
}

/**
 * Linkup検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithLinkup(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`Linkupで検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のAPIを使用
    const mockResults = [
      {
        title: `Linkup検索結果: ${query}`,
        url: 'https://example.com/linkup/result1',
        content: `これは「${query}」に関するLinkup検索結果のサンプルです。`,
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('Linkup検索エラー:', error);
    return [];
  }
}

/**
 * Google検索API
 * @param query 検索クエリ
 * @param params 追加パラメータ
 * @returns 検索結果
 */
async function searchWithGoogleSearch(
  query: string,
  params: Record<string, unknown>
): Promise<SearchResult[]> {
  console.log(`Google検索: "${query}"`);
  
  try {
    // モック実装 - 実際の実装では本物のGoogle Custom Search APIを使用
    const mockResults = [
      {
        title: `Google検索結果: ${query}`,
        url: 'https://example.com/google/result1',
        content: `これは「${query}」に関するGoogle検索結果のサンプルです。`,
      },
      {
        title: `Google検索結果2: ${query}`,
        url: 'https://example.com/google/result2',
        content: `これは「${query}」に関するGoogleの別の結果です。`,
      },
    ];
    
    return normalizeSearchResults(mockResults);
  } catch (error) {
    console.error('Google検索エラー:', error);
    return [];
  }
}

/**
 * URLからWebコンテンツを取得
 * @param url 取得するURL
 * @returns 取得したWebコンテンツ
 */
export async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    
    // HTMLタグを除去する簡易的な実装
    const text = response.data.toString()
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error(`URLからのコンテンツ取得エラー: ${url}`, error);
    return '';
  }
}

/**
 * 検索結果を見やすいテキスト形式にフォーマット
 * @param results 検索結果
 * @returns フォーマットされたテキスト
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) {
    return '検索結果はありません。';
  }
  
  return results.map((result, index) => {
    return `【検索結果 ${index + 1}】
タイトル: ${result.title}
URL: ${result.url}
コンテンツ:
${result.content}
---------------------`;
  }).join('\n\n');
}

/**
 * セクションをJSON文字列としてフォーマット
 * @param sections セクションの配列
 * @returns フォーマットされたJSON文字列
 */
export function formatSections(sections: Section[]): string {
  return JSON.stringify(sections, null, 2);
}

/**
 * HTMLエンティティをデコード
 * @param text デコードするテキスト
 * @returns デコード後のテキスト
 */
export function decodeHtmlEntities(text: string): string {
  // ブラウザ環境でのみ動作する実装
  // サーバーサイドでは別のライブラリが必要
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  
  return text.replace(/&\w+;|&#\d+;/g, entity => {
    return entities[entity] || entity;
  });
}

/**
 * テキスト内の不要な空白を削除
 * @param text クリーニングするテキスト
 * @returns クリーニング後のテキスト
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * 単純なレート制限機能付きの待機関数
 * @param ms 待機するミリ秒
 * @returns Promiseインスタンス
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms)); 