/**
 * Deep Researchのための設定オプション
 */

/** デフォルトのレポート構造 */
export const DEFAULT_REPORT_STRUCTURE = `Use this structure to create a report on the user-provided topic:

1. Introduction (no research needed)
   - Brief overview of the topic area

2. Main Body Sections:
   - Each section should focus on a sub-topic of the user-provided topic
   
3. Conclusion
   - Aim for 1 structural element (either a list of table) that distills the main body sections 
   - Provide a concise summary of the report`;

/** 利用可能な検索API */
export enum SearchAPI {
  PERPLEXITY = 'perplexity',
  TAVILY = 'tavily',
  EXA = 'exa',
  ARXIV = 'arxiv',
  PUBMED = 'pubmed',
  LINKUP = 'linkup',
  DUCKDUCKGO = 'duckduckgo',
  GOOGLESEARCH = 'googlesearch',
}

/** 検索API設定オプションの型 */
export type SearchApiConfigOptions = {
  maxResults?: number;
  includeRawContent?: boolean;
  maxCharacters?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  subpages?: number;
  depth?: string;
  email?: string;
  apiKey?: string;
};

/** 進捗コールバック関数の型 */
export type ProgressCallback = (message: string) => Promise<void>;

/** 実行時の設定オプション */
export interface RunnableConfig {
  configurable?: Record<string, unknown>;
}

/**
 * Deep Researchのための設定クラス
 */
export class Configuration {
  /** レポートの構造テンプレート */
  reportStructure: string;
  
  /** イテレーションごとに生成する検索クエリの数 */
  numberOfQueries: number;
  
  /** 最大検索の深さ（反復+検索イテレーションの最大数） */
  maxSearchDepth: number;
  
  /** プランナーのプロバイダー */
  plannerProvider: string;
  
  /** プランナーのモデル */
  plannerModel: string;
  
  /** ライターのプロバイダー */
  writerProvider: string;
  
  /** ライターのモデル */
  writerModel: string;
  
  /** 使用する検索API */
  searchApi: SearchAPI;
  
  /** 検索API用の追加設定 */
  searchApiConfig?: SearchApiConfigOptions;

  /** 進捗状況を通知するコールバック関数 */
  progressCallback?: ProgressCallback;

  /**
   * 設定クラスのコンストラクタ
   */
  constructor({
    reportStructure = DEFAULT_REPORT_STRUCTURE,
    numberOfQueries = 2,
    maxSearchDepth = 2,
    plannerProvider = 'anthropic',
    plannerModel = 'claude-3-7-sonnet-latest',
    writerProvider = 'anthropic',
    writerModel = 'claude-3-5-sonnet-latest',
    searchApi = SearchAPI.TAVILY,
    searchApiConfig = undefined,
    progressCallback = undefined,
  }: Partial<Configuration> = {}) {
    this.reportStructure = reportStructure;
    this.numberOfQueries = numberOfQueries;
    this.maxSearchDepth = maxSearchDepth;
    this.plannerProvider = plannerProvider;
    this.plannerModel = plannerModel;
    this.writerProvider = writerProvider;
    this.writerModel = writerModel;
    this.searchApi = searchApi;
    this.searchApiConfig = searchApiConfig;
    this.progressCallback = progressCallback;
  }

  /**
   * RunnableConfigから設定インスタンスを作成する
   * @param config 実行時設定
   * @returns 設定インスタンス
   */
  static fromRunnableConfig(config?: RunnableConfig): Configuration {
    const configurable = config?.configurable || {};
    
    // 環境変数からSearchAPI型への変換
    let searchApiValue: SearchAPI | undefined;
    if (process.env.SEARCH_API) {
      // 環境変数の値が有効なSearchAPI値かチェック
      const envValue = process.env.SEARCH_API;
      if (Object.values(SearchAPI).includes(envValue as SearchAPI)) {
        searchApiValue = envValue as SearchAPI;
      }
    } else {
      searchApiValue = configurable.searchApi as SearchAPI;
    }
    
    // 環境変数またはconfigurableから値を取得
    const values: Partial<Configuration> = {
      reportStructure: process.env.REPORT_STRUCTURE || configurable.reportStructure as string,
      numberOfQueries: process.env.NUMBER_OF_QUERIES ? Number.parseInt(process.env.NUMBER_OF_QUERIES, 10) : configurable.numberOfQueries as number,
      maxSearchDepth: process.env.MAX_SEARCH_DEPTH ? Number.parseInt(process.env.MAX_SEARCH_DEPTH, 10) : configurable.maxSearchDepth as number,
      plannerProvider: process.env.PLANNER_PROVIDER || configurable.plannerProvider as string,
      plannerModel: process.env.PLANNER_MODEL || configurable.plannerModel as string,
      writerProvider: process.env.WRITER_PROVIDER || configurable.writerProvider as string,
      writerModel: process.env.WRITER_MODEL || configurable.writerModel as string,
      searchApi: searchApiValue,
      searchApiConfig: configurable.searchApiConfig as SearchApiConfigOptions,
      progressCallback: configurable.progressCallback as ProgressCallback,
    };
    
    // 未定義の値を除外する
    const keys = Object.keys(values) as Array<keyof Configuration>;
    for (const key of keys) {
      if (values[key] === undefined) {
        delete values[key];
      }
    }
    
    return new Configuration(values);
  }
} 