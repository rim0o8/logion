import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import type FirecrawlApp from '@mendable/firecrawl-js';
import pLimit from 'p-limit';
import type {
    ResearchParams,
    SearchResult
} from './api';
import {
    fetchWebContent,
    searchWeb,
    setupFirecrawl,
} from './api';

// コンテンツ分析結果の型定義
interface AnalysisResult {
  url: string;
  title: string;
  analysis: string;
}

// 研究プロセスの状態を管理するクラス
export class DeepResearchEngine {
  private llm: ChatOpenAI | ChatAnthropic;
  private firecrawl: FirecrawlApp;
  private query: string;
  private depth: number;
  private breadth: number;
  private concurrencyLimit: number;
  private findings: string[] = [];
  private searchCache: Map<string, SearchResult[]> = new Map();
  private contentCache: Map<string, string> = new Map();
  private onProgress?: (message: string, progress: number) => void;

  constructor(params: ResearchParams, onProgress?: (message: string, progress: number) => void) {
    // LLMプロバイダーの初期化
    if (params.model.includes('gpt')) {
      const apiKey = params.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI APIキーがサーバー環境に設定されていません。サーバー管理者に連絡してください。');
      }
      this.llm = new ChatOpenAI({
        modelName: params.model,
        temperature: 0.7,
        maxTokens: 4000,
        apiKey
      });
    } else if (params.model.includes('claude')) {
      const apiKey = params.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic APIキーがサーバー環境に設定されていません。サーバー管理者に連絡してください。');
      }
      this.llm = new ChatAnthropic({
        modelName: params.model,
        temperature: 0.7,
        maxTokens: 4000,
        apiKey
      });
    } else {
      throw new Error(`モデル ${params.model} はサポートされていません。`);
    }
    
    // Firecrawlの設定
    const firecrawlApiKey = params.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      throw new Error('Firecrawl APIキーがサーバー環境に設定されていません。サーバー管理者に連絡してください。');
    }
    this.firecrawl = setupFirecrawl(firecrawlApiKey);
    
    this.query = params.query;
    this.depth = params.depth;
    this.breadth = params.breadth;
    this.concurrencyLimit = 3; // 同時実行数の制限
    this.onProgress = onProgress;
  }

  // 進捗状況の更新
  private updateProgress(message: string, progress: number): void {
    if (this.onProgress) {
      this.onProgress(message, progress);
    }
  }

  // 研究の実行
  public async run(): Promise<string> {
    this.findings = [];
    this.updateProgress('リサーチを開始します...', 0);

    // 初期クエリの提案
    const searchQueries = await this.generateSearchQueries(this.query);
    this.updateProgress('検索クエリを生成しました', 5);

    // リサーチの深さに基づく反復
    let currentContext = '';
    let totalProgress = 5;
    const progressPerDepth = (95 - totalProgress) / this.depth;

    for (let i = 0; i < this.depth; i++) {
      this.updateProgress(`深さ ${i + 1}/${this.depth} のリサーチを実行しています...`, totalProgress);
      
      // この深さレベルでの検索と分析
      const depthFindings = await this.researchOneDepthLevel(
        i === 0 ? searchQueries : await this.generateSearchQueries(`${this.query} ${currentContext}`),
        i + 1
      );
      
      // 見つかった情報を追加
      this.findings.push(...depthFindings);
      
      // 次のレベルのための文脈を作成
      const currentFindings = depthFindings.join('\n\n');
      currentContext = await this.refineResearch(currentFindings);
      
      totalProgress += progressPerDepth;
      this.updateProgress(`深さ ${i + 1}/${this.depth} のリサーチが完了しました`, totalProgress);
    }

    // 最終レポートの生成
    this.updateProgress('最終レポートを生成しています...', 95);
    const finalReport = await this.generateFinalReport();
    this.updateProgress('リサーチが完了しました', 100);

    return finalReport;
  }

  // 検索クエリの生成
  private async generateSearchQueries(query: string): Promise<string[]> {
    const searchPrompt = PromptTemplate.fromTemplate(`あなたは優れた研究アシスタントです。以下のトピックに関する効果的な検索クエリを5つ生成してください。
各クエリは別々の行に記載し、多様な視点からトピックを探索できるようにしてください。

研究トピック: {query}

検索クエリ:`);
    
    const searchChain = RunnableSequence.from([
      searchPrompt,
      this.llm,
      new StringOutputParser(),
    ]);
    
    const result = await searchChain.invoke({ query });
    
    // 生成されたテキストから検索クエリを抽出
    return result
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  // 1つの深さレベルでの研究実行
  private async researchOneDepthLevel(
    searchQueries: string[],
    depthLevel: number
  ): Promise<string[]> {
    // 並列処理のためのリミッターの設定
    const limit = pLimit(this.concurrencyLimit);
    const findings: string[] = [];
    
    // 実行する検索クエリの数を制限（ブレッドス）
    const queriesToUse = searchQueries.slice(0, this.breadth);
    
    // 各クエリで検索と分析を実行
    const progressPerQuery = 0.9 / queriesToUse.length;
    let queryProgress = 0;
    
    const analysisPromises = queriesToUse.map((query, idx) => 
      limit(async () => {
        this.updateProgress(
          `クエリ ${idx + 1}/${queriesToUse.length}: "${query}" の検索結果を処理しています`,
          queryProgress
        );
        
        // 検索の実行
        const searchResults = await this.executeSearch(query);
        
        // 上位の結果を取得
        const topResults = searchResults.slice(0, 3);
        
        // 各結果のコンテンツを取得して分析
        const analysisResults = await Promise.all(
          topResults.map(result => this.analyzeContent(result, this.query))
        );
        
        // 分析結果を追加
        const validResults = analysisResults.filter((r): r is AnalysisResult => r !== null);
        findings.push(...validResults.map(r => r.analysis));
        
        queryProgress += progressPerQuery;
        return validResults;
      })
    );
    
    await Promise.all(analysisPromises);
    return findings;
  }

  // 検索の実行
  private async executeSearch(query: string): Promise<SearchResult[]> {
    // キャッシュをチェック
    if (this.searchCache.has(query)) {
      return this.searchCache.get(query) || [];
    }
    
    try {
      const results = await searchWeb(this.firecrawl, query);
      
      // キャッシュに結果を保存
      this.searchCache.set(query, results);
      return results;
    } catch (error) {
      console.error(`検索中にエラーが発生しました: ${query}`, error);
      return [];
    }
  }

  // コンテンツの分析
  private async analyzeContent(
    result: SearchResult,
    researchTopic: string
  ): Promise<AnalysisResult | null> {
    try {
      const content = await fetchWebContent(this.firecrawl, result.url);
      
      if (!content) {
        return null;
      }
      
      // コンテンツの分析を行う
      const analyzePrompt = PromptTemplate.fromTemplate(`あなたは優れた研究アシスタントです。以下のWebコンテンツを分析し、指定された研究トピックに関連する重要な情報を抽出してください。
分析は簡潔かつ客観的に行い、情報源からの事実に基づいて記述してください。

研究トピック: {researchTopic}
ページタイトル: {title}
URL: {url}

コンテンツ:
{text}

分析:`);
      
      const analyzeChain = RunnableSequence.from([
        analyzePrompt,
        this.llm,
        new StringOutputParser(),
      ]);
      
      const analysis = await analyzeChain.invoke({
        researchTopic,
        title: content.title || result.title,
        url: result.url,
        text: content.text.slice(0, 10000), // 長すぎる場合はカット
      });
      
      return {
        url: result.url,
        title: content.title || result.title,
        analysis,
      };
    } catch (error) {
      console.error(`コンテンツ分析中にエラーが発生しました: ${result.url}`, error);
      return null;
    }
  }

  // 研究の改善と次のステップの提案
  private async refineResearch(currentFindings: string): Promise<string> {
    const refinePrompt = PromptTemplate.fromTemplate(`あなたは優れた研究アシスタントです。これまでの研究で収集した情報を確認し、さらに調査すべき重要な側面や欠けている視点を特定してください。
これらの新たな視点を考慮した、より深い理解を得るための提案を行ってください。

研究トピック: {researchTopic}

これまでの調査結果:
{currentFindings}

さらに探求すべき側面:`);
    
    const refineChain = RunnableSequence.from([
      refinePrompt,
      this.llm,
      new StringOutputParser(),
    ]);
    
    return await refineChain.invoke({
      researchTopic: this.query,
      currentFindings,
    });
  }

  // 最終レポートの生成
  private async generateFinalReport(): Promise<string> {
    const allFindings = this.findings.join('\n\n');
    
    const summaryPrompt = PromptTemplate.fromTemplate(`あなたは優れた研究アシスタントです。以下の調査結果に基づいて、包括的で構造化された研究レポートを作成してください。
レポートには以下の要素を含めてください：
1. 要約（概要）
2. 主要な発見事項（箇条書きで3〜5点）
3. 詳細な分析（サブセクションに分けて）
4. 結論と見解
5. 今後の研究方向性

研究トピック: {researchTopic}

調査結果:
{allFindings}

研究レポート:`);
    
    const summaryChain = RunnableSequence.from([
      summaryPrompt,
      this.llm,
      new StringOutputParser(),
    ]);
    
    const report = await summaryChain.invoke({
      researchTopic: this.query,
      allFindings,
    });
    
    return report;
  }
}