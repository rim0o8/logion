import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import type FirecrawlApp from '@mendable/firecrawl-js';
import {
  fetchWebContent,
  searchWeb,
  setupFirecrawl,
} from '../api/firecrawl';
import {
  fetchWebContentWithTavily,
  searchWebWithTavily,
  setupTavily,
} from '../api/tavily';
import type {
  AnalysisResult,
  ResearchParams,
  SearchResult,
  WebContent
} from '../types';
import {
  ANALYZE_CONTENT_PROMPT,
  FINAL_REPORT_PROMPT,
  REFINE_RESEARCH_PROMPT,
  REFLECTION_PROMPT,
  SEARCH_QUERIES_PROMPT
} from './prompts';

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

// Debug logging utility
function logDebug(context: string, message: string, data?: unknown): void {
  console.log(`[Deep Research][${context}] ${message}`);
  if (data !== undefined) {
    if (typeof data === 'string') {
      console.log(`[Deep Research][${context}] Data: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    } else {
      console.log(`[Deep Research][${context}] Data:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    }
  }
}

// Class to manage the state of the research process
export class DeepResearchEngine {
  private llm: ChatOpenAI | ChatAnthropic;
  private firecrawl: FirecrawlApp | null = null;
  private tavilyClient: TavilyClient | null = null;
  private query: string;
  private depth: number;
  private breadth: number;
  private concurrencyLimit: number;
  private findings: string[] = [];
  private reflections: string[] = [];
  private searchCache: Map<string, SearchResult[]> = new Map();
  private onProgress?: (message: string, progress: number) => void;
  private searchProvider: 'firecrawl' | 'tavily';

  constructor(params: ResearchParams, onProgress?: (message: string, progress: number) => void) {
    logDebug('Constructor', 'Initializing DeepResearchEngine', { 
      model: params.model, 
      query: params.query,
      depth: params.depth,
      breadth: params.breadth,
      searchProvider: params.searchProvider
    });
    
    // Initialize LLM provider
    if (params.model.includes('gpt')) {
      const apiKey = params.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not set in server environment. Please contact server administrator.');
      }
      logDebug('Constructor', 'Using OpenAI model', { model: params.model });
      this.llm = new ChatOpenAI({
        modelName: params.model,
        temperature: 0.7,
        maxTokens: 4000,
        apiKey
      });
    } else if (params.model.includes('claude')) {
      const apiKey = params.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key is not set in server environment. Please contact server administrator.');
      }
      logDebug('Constructor', 'Using Anthropic model', { model: params.model });
      this.llm = new ChatAnthropic({
        modelName: params.model,
        temperature: 0.7,
        maxTokens: 4000,
        apiKey
      });
    } else {
      throw new Error(`Model ${params.model} is not supported.`);
    }
    
    // Set search provider
    this.searchProvider = params.searchProvider || 'firecrawl';
    
    // Configure search provider
    if (this.searchProvider === 'firecrawl') {
      // Configure Firecrawl
      const firecrawlApiKey = params.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        throw new Error('Firecrawl API key is not set in server environment. Please contact server administrator.');
      }
      logDebug('Constructor', 'Setting up Firecrawl');
      this.firecrawl = setupFirecrawl(firecrawlApiKey);
    } else if (this.searchProvider === 'tavily') {
      // Configure Tavily
      const tavilyApiKey = params.tavilyApiKey || process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        throw new Error('Tavily API key is not set in server environment. Please contact server administrator.');
      }
      logDebug('Constructor', 'Setting up Tavily');
      this.tavilyClient = setupTavily(tavilyApiKey);
    }
    
    this.query = params.query;
    this.depth = params.depth;
    this.breadth = params.breadth;
    this.concurrencyLimit = 1; // Limit concurrent requests to avoid rate limits
    this.onProgress = onProgress;
    
    logDebug('Constructor', 'DeepResearchEngine initialized successfully');
  }

  // Update progress status
  private updateProgress(message: string, progress: number): void {
    // Ensure progress is a number between 0 and 100
    const validProgress = Math.max(0, Math.min(100, progress));
    
    logDebug('Progress', message, { progress: validProgress });
    if (this.onProgress) {
      this.onProgress(message, validProgress);
    }
  }

  // Execute research process
  public async run(): Promise<string> {
    this.findings = [];
    this.reflections = [];
    this.updateProgress('研究プロセスを開始します...', 0);
    logDebug('Run', 'Starting research process', { query: this.query });

    // Initial query proposal
    logDebug('Run', 'Generating search queries');
    const searchQueries = await this.generateSearchQueries(this.query);
    logDebug('Run', 'Search queries generated', { queries: searchQueries });
    this.updateProgress('検索クエリを生成しました', 5);

    // Iterate based on research depth
    let currentContext = '';
    
    // Calculate progress distribution - allocate percentages to different phases
    const totalProgress = 95; // Reserve 5% for initial and final steps
    const progressPerDepth = totalProgress / this.depth;
    let currentBaseProgress = 5; // Start after initial 5%
    
    for (let i = 0; i < this.depth; i++) {
      const depthBaseProgress = currentBaseProgress;
      const searchProgress = depthBaseProgress + progressPerDepth * 0.1;
      const analysisProgress = depthBaseProgress + progressPerDepth * 0.6;
      const reflectionProgress = depthBaseProgress + progressPerDepth * 0.8;
      const refinementProgress = depthBaseProgress + progressPerDepth * 0.9;
      const completionProgress = depthBaseProgress + progressPerDepth;
      
      logDebug('Run', `Starting research depth ${i + 1}/${this.depth}`);
      this.updateProgress(`調査フェーズ ${i + 1}/${this.depth} を開始します...`, depthBaseProgress);
      
      // Research and analysis for this depth level
      const nextQueries = i === 0 ? searchQueries : 
        await this.generateSearchQueries(`${this.query} ${currentContext}`);
      
      this.updateProgress(`検索クエリを処理しています... (フェーズ ${i + 1}/${this.depth})`, searchProgress);
      logDebug('Run', `Using queries for depth ${i + 1}`, { queries: nextQueries });
      
      const depthFindings = await this.researchOneDepthLevel(
        nextQueries,
        i + 1,
        depthBaseProgress + progressPerDepth * 0.1,
        analysisProgress - (depthBaseProgress + progressPerDepth * 0.1)
      );
      
      // Add found information
      this.updateProgress(`情報を分析しています... (フェーズ ${i + 1}/${this.depth})`, analysisProgress);
      logDebug('Run', `Findings from depth ${i + 1}`, { 
        count: depthFindings.length,
        samples: depthFindings.map(f => `${f.substring(0, 50)}...`) 
      });
      this.findings.push(...depthFindings);
      
      // Reflection step - analyze current findings and identify gaps
      const currentFindings = this.findings.join('\n\n');
      
      this.updateProgress(`調査結果を振り返っています... (フェーズ ${i + 1}/${this.depth})`, reflectionProgress);
      logDebug('Run', 'Performing reflection on current findings');
      const reflection = await this.performReflection(currentFindings);
      logDebug('Run', 'Reflection completed', { 
        reflectionLength: reflection.length,
        reflectionPreview: `${reflection.substring(0, 200)}...` 
      });
      this.reflections.push(reflection);
      
      // Refine direction based on reflection
      this.updateProgress(`次の調査方向を検討しています... (フェーズ ${i + 1}/${this.depth})`, refinementProgress);
      logDebug('Run', 'Refining research based on reflection');
      currentContext = await this.refineResearch(currentFindings, reflection);
      logDebug('Run', 'Research refinement complete', { 
        refinementContext: `${currentContext.substring(0, 200)}...` 
      });
      
      currentBaseProgress = completionProgress;
      this.updateProgress(`調査フェーズ ${i + 1}/${this.depth} が完了しました`, completionProgress);
    }

    // Generate final report
    this.updateProgress('最終レポートを生成しています...', 95);
    logDebug('Run', 'Generating final report', { 
      findingsCount: this.findings.length,
      reflectionsCount: this.reflections.length
    });
    const finalReport = await this.generateFinalReport();
    logDebug('Run', 'Final report generated', { 
      reportLength: finalReport.length,
      reportPreview: `${finalReport.substring(0, 200)}...` 
    });
    this.updateProgress('調査が完了しました', 100);

    return finalReport;
  }

  // Generate search queries
  private async generateSearchQueries(query: string): Promise<string[]> {
    logDebug('GenerateQueries', 'Generating search queries', { query });
    
    const searchChain = RunnableSequence.from([
      SEARCH_QUERIES_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
    
    logDebug('GenerateQueries', 'Sending prompt to LLM');
    const result = await searchChain.invoke({ query });
    logDebug('GenerateQueries', 'LLM response received', { response: result });
    
    // Extract search queries from generated text
    const queries = result
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    logDebug('GenerateQueries', 'Extracted queries', { queries });
    return queries;
  }

  // Helper method to add delay between API calls
  private delay(ms: number): Promise<void> {
    logDebug('Delay', `Waiting for ${ms}ms`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Execute search
  private async executeSearch(query: string): Promise<SearchResult[]> {
    // Check cache
    if (this.searchCache.has(query)) {
      logDebug('ExecuteSearch', 'Using cached search results', { query });
      return this.searchCache.get(query) || [];
    }
    
    try {
      // Add delay to avoid rate limiting
      await this.delay(2000);
      
      let results: SearchResult[] = [];
      
      if (this.searchProvider === 'firecrawl' && this.firecrawl) {
        logDebug('ExecuteSearch', 'Executing search with Firecrawl', { query });
        // Search with Firecrawl
        results = await this.searchWeb(query, 3); // Retry up to 3 times
      } else if (this.searchProvider === 'tavily' && this.tavilyClient) {
        logDebug('ExecuteSearch', 'Executing search with Tavily', { query });
        // Search with Tavily
        results = await searchWebWithTavily(this.tavilyClient, query);
      } else {
        throw new Error(`Search provider ${this.searchProvider} is not properly configured.`);
      }
      
      logDebug('ExecuteSearch', 'Search results received', { 
        query, 
        count: results.length,
        urls: results.map(r => r.url)
      });
      
      // Save results to cache
      this.searchCache.set(query, results);
      return results;
    } catch (error) {
      logDebug('ExecuteSearch', 'Error during search', { 
        query, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  // Search with retry logic (Firecrawl specific)
  private async searchWeb(query: string, retries: number): Promise<SearchResult[]> {
    if (!this.firecrawl) {
      throw new Error('Firecrawl client is not initialized');
    }
    
    try {
      logDebug('SearchWeb', 'Executing search', { query, retriesLeft: retries });
      return await searchWeb(this.firecrawl, query);
    } catch (error: unknown) {
      // Check if it's a rate limit error (429)
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDebug('SearchWeb', 'Search error', { error: errorMessage });
      
      if (errorMessage.includes('429') && retries > 0) {
        const waitTime = 2000 * (4 - retries);
        logDebug('SearchWeb', 'Rate limit hit, waiting and retrying...', { 
          retriesLeft: retries, 
          waitTime 
        });
        // Wait longer between retries (exponential backoff)
        await this.delay(waitTime);
        return this.searchWeb(query, retries - 1);
      }
      throw error;
    }
  }

  // Research execution for one depth level
  private async researchOneDepthLevel(
    searchQueries: string[],
    depthLevel: number,
    startProgress = 0,
    progressRange = 0.9
  ): Promise<string[]> {
    logDebug('ResearchDepthLevel', `Starting research at depth ${depthLevel}`, { 
      queryCount: searchQueries.length 
    });
    
    // Limit execution to a certain number of queries (breadth)
    const queriesToUse = searchQueries.slice(0, this.breadth);
    logDebug('ResearchDepthLevel', 'Using queries for this depth level', { 
      queries: queriesToUse 
    });
    
    // Execute search and analysis for each query
    const progressPerQuery = progressRange / queriesToUse.length;
    let currentProgress = startProgress;
    const findings: string[] = [];
    
    // Process search queries sequentially instead of in parallel
    for (let idx = 0; idx < queriesToUse.length; idx++) {
      const query = queriesToUse[idx];
      
      this.updateProgress(
        `検索クエリを処理中 (${idx + 1}/${queriesToUse.length}): "${query}"`,
        currentProgress
      );
      
      try {
        logDebug('ResearchDepthLevel', `Processing search query ${idx + 1}/${queriesToUse.length}`, { 
          query 
        });
        
        // Execute search
        const searchResults = await this.executeSearch(query);
        
        // Get top results
        const topResults = searchResults.slice(0, 3);
        logDebug('ResearchDepthLevel', 'Using top results for analysis', { 
          count: topResults.length,
          urls: topResults.map(r => r.url)
        });
        
        // Process results one by one with delay between each
        const analysisResults: (AnalysisResult | null)[] = [];
        
        // Calculate sub-progress for each URL within this query
        const urlProgressStep = progressPerQuery / Math.max(1, topResults.length);
        let urlProgressBase = currentProgress;
        
        // Use for loop with index instead of for-of with entries()
        for (let urlIdx = 0; urlIdx < topResults.length; urlIdx++) {
          const result = topResults[urlIdx];
          this.updateProgress(
            `ウェブコンテンツを分析中 (${urlIdx + 1}/${topResults.length}): ${result.url}`,
            urlProgressBase
          );
          
          logDebug('ResearchDepthLevel', 'Analyzing content', { url: result.url });
          await this.delay(1500); // Add delay between content fetches
          analysisResults.push(await this.analyzeContent(result, this.query));
          
          urlProgressBase += urlProgressStep;
        }
        
        // Add analysis results
        const validResults = analysisResults.filter((r): r is AnalysisResult => r !== null);
        logDebug('ResearchDepthLevel', 'Analysis results', { 
          validCount: validResults.length,
          invalidCount: analysisResults.length - validResults.length
        });
        
        findings.push(...validResults.map(r => r.analysis));
      } catch (error) {
        logDebug('ResearchDepthLevel', 'Error processing query', { 
          query,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      currentProgress += progressPerQuery;
    }
    
    logDebug('ResearchDepthLevel', `Completed research at depth ${depthLevel}`, { 
      findingsCount: findings.length 
    });
    return findings;
  }

  // Fetch content with retry logic (Firecrawl specific)
  private async fetchContentWithRetry(url: string, retries: number): Promise<{ title: string, text: string } | null> {
    if (!this.firecrawl) {
      throw new Error('Firecrawl client is not initialized');
    }
    
    try {
      logDebug('FetchContent', 'Fetching content', { url, retriesLeft: retries });
      return await fetchWebContent(this.firecrawl, url);
    } catch (error: unknown) {
      // Check if it's a rate limit error (429)
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDebug('FetchContent', 'Content fetch error', { error: errorMessage });
      
      if (errorMessage.includes('429') && retries > 0) {
        const waitTime = 2000 * (4 - retries);
        logDebug('FetchContent', 'Rate limit hit during content fetch, waiting and retrying...', { 
          retriesLeft: retries, 
          waitTime 
        });
        // Wait longer between retries (exponential backoff)
        await this.delay(waitTime);
        return this.fetchContentWithRetry(url, retries - 1);
      }
      throw error;
    }
  }

  // Analyze content with retry logic
  private async analyzeContent(
    result: SearchResult,
    researchTopic: string
  ): Promise<AnalysisResult | null> {
    try {
      // Add delay to avoid rate limiting
      await this.delay(1000);
      
      logDebug('AnalyzeContent', 'Fetching content for analysis', { url: result.url });
      
      let content: WebContent | null = null;
      
      if (this.searchProvider === 'firecrawl' && this.firecrawl) {
        // Fetch content with Firecrawl
        content = await this.fetchContentWithRetry(result.url, 3);
      } else if (this.searchProvider === 'tavily' && this.tavilyClient) {
        // Fetch content with Tavily
        content = await fetchWebContentWithTavily(this.tavilyClient, result.url);
      } else {
        throw new Error(`Search provider ${this.searchProvider} is not properly configured.`);
      }
      
      if (!content) {
        logDebug('AnalyzeContent', 'No content available for URL', { url: result.url });
        return null;
      }
      
      logDebug('AnalyzeContent', 'Content fetched successfully', { 
        url: result.url,
        contentLength: content.text.length,
        titleLength: content.title.length
      });
      
      // Analyze the content
      const analyzeChain = RunnableSequence.from([
        ANALYZE_CONTENT_PROMPT,
        this.llm,
        new StringOutputParser(),
      ]);
      
      logDebug('AnalyzeContent', 'Sending content for analysis to LLM', {
        url: result.url,
        contentPreview: `${content.text.substring(0, 100)}...`
      });
      
      const analysis = await analyzeChain.invoke({
        researchTopic,
        title: content.title || result.title,
        url: result.url,
        text: content.text.slice(0, 10000), // Cut if too long
      });
      
      logDebug('AnalyzeContent', 'Analysis received from LLM', {
        url: result.url,
        analysisLength: analysis.length,
        analysisPreview: `${analysis.substring(0, 100)}...`
      });
      
      return {
        url: result.url,
        title: content.title || result.title,
        analysis,
      };
    } catch (error) {
      logDebug('AnalyzeContent', 'Error during content analysis', {
        url: result.url,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // Perform reflection on current findings
  private async performReflection(currentFindings: string): Promise<string> {
    logDebug('Reflection', 'Performing reflection on current findings', {
      findingsLength: currentFindings.length
    });
    
    const reflectionChain = RunnableSequence.from([
      REFLECTION_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
    
    logDebug('Reflection', 'Sending reflection prompt to LLM');
    
    const reflection = await reflectionChain.invoke({
      researchTopic: this.query,
      currentFindings,
    });
    
    logDebug('Reflection', 'Reflection received from LLM', {
      reflectionLength: reflection.length,
      reflectionPreview: `${reflection.substring(0, 100)}...`
    });
    
    return reflection;
  }

  // Research improvement and next step proposal
  private async refineResearch(currentFindings: string, reflection = ''): Promise<string> {
    logDebug('RefineResearch', 'Refining research based on findings and reflection', {
      findingsLength: currentFindings.length,
      reflectionLength: reflection.length
    });
    
    // Include reflection in the prompt if available
    const inputFindings = reflection 
      ? `${currentFindings}\n\nReflection on Current Findings:\n${reflection}`
      : currentFindings;
    
    const refineChain = RunnableSequence.from([
      REFINE_RESEARCH_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
    
    logDebug('RefineResearch', 'Sending refinement prompt to LLM');
    
    const result = await refineChain.invoke({
      researchTopic: this.query,
      currentFindings: inputFindings,
    });
    
    logDebug('RefineResearch', 'Refinement result received from LLM', {
      resultLength: result.length,
      resultPreview: `${result.substring(0, 100)}...`
    });
    
    return result;
  }

  // Generate final report
  private async generateFinalReport(): Promise<string> {
    // Include reflections in the findings for a more comprehensive report
    const allFindings = [
      ...this.findings,
      '\n\n研究プロセスの振り返り（リフレクション）:\n',
      ...this.reflections
    ].join('\n\n');
    
    logDebug('GenerateFinalReport', 'Generating final report', {
      findingsCount: this.findings.length,
      reflectionsCount: this.reflections.length,
      allContentLength: allFindings.length
    });
    
    const summaryChain = RunnableSequence.from([
      FINAL_REPORT_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
    
    logDebug('GenerateFinalReport', 'Sending report generation prompt to LLM');
    
    const report = await summaryChain.invoke({
      researchTopic: this.query,
      allFindings,
    });
    
    logDebug('GenerateFinalReport', 'Final report received from LLM', {
      reportLength: report.length,
      reportPreview: `${report.substring(0, 100)}...`
    });
    
    return report;
  }
} 