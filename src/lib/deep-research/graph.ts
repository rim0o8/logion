import { Config } from "@/utils/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatDeepSeek } from "@langchain/deepseek";
import { Command, END, START, Send, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { Configuration, SearchApiConfigOptions } from "./configuration";
import {
    finalSectionWriterInstructions,
    queryWriterInstructions,
    reportPlannerInstructions,
    reportPlannerQueryWriterInstructions,
    sectionGraderInstructions,
    sectionWriterInstructions
} from "./prompts";
import {
    Feedback,
    ReportState,
    SearchQuery,
    Section,
    SectionState
} from "./state";
import {
    SearchResult,
    formatSearchResults,
    formatSections,
    getConfigValue,
    getSearchParams,
    selectAndExecuteSearch
} from "./utils";

// Helper to initialize chat model
function initChatModel(model: string, modelProvider: string) {
  console.log(`[DEBUG] モデル初期化: provider=${modelProvider}, model=${model}`);
  switch (modelProvider.toLowerCase()) {
    case 'anthropic':
      return new ChatAnthropic({
        modelName: model,
        apiKey: Config.ANTHROPIC_API_KEY,
      });
    case 'deepseek':
      return new ChatDeepSeek({
        modelName: model,
        apiKey: Config.DEEPSEEK_API_KEY,
      });
    default:
      return new ChatOpenAI({
        modelName: model,
        apiKey: Config.OPENAI_API_KEY,
      });
  }
}

/**
 * Generate the initial report plan with sections.
 * 
 * This node:
 * 1. Gets configuration for the report structure and search parameters
 * 2. Generates search queries to gather context for planning
 * 3. Performs web searches using those queries
 * 4. Uses an LLM to generate a structured plan with sections
 */
async function generateReportPlan(state: ReportState, config: RunnableConfig) {
  console.log("[DEBUG] レポートプラン生成開始: トピック=", state.topic);
  
  // Inputs
  const topic = state.topic;
  const feedback = state.feedback_on_report_plan || "";

  // Get configuration
  const configurable = Configuration.fromRunnableConfig(config);
  const reportStructure = configurable.reportStructure;
  const numberOfQueries = configurable.numberOfQueries;
  const searchApi = getConfigValue(configurable.searchApi);
  const searchApiConfig = configurable.searchApiConfig || {};
  const paramsToPass = getSearchParams(searchApi, searchApiConfig);
  const progressCallback = configurable.progressCallback;

  console.log(`[DEBUG] 設定: searchApi=${searchApi}, numberOfQueries=${numberOfQueries}`);
  console.log(`[DEBUG] 検索パラメータ:`, paramsToPass);

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("レポート計画を生成中...");
  }

  // Set writer model (used for query writing)
  const writerProvider = getConfigValue(configurable.writerProvider);
  const writerModelName = getConfigValue(configurable.writerModel);
  const writerModel = initChatModel(writerModelName, writerProvider);
  
  // Format system instructions for query generation
  const systemInstructionsQuery = reportPlannerQueryWriterInstructions.replace(
    "{topic}", topic
  ).replace(
    "{reportStructure}", reportStructure
  ).replace(
    "{numberOfQueries}", numberOfQueries.toString()
  );

  console.log(`[DEBUG] クエリ生成用システムプロンプト長: ${systemInstructionsQuery.length}文字`);

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("検索クエリを生成しています...");
  }

  // Generate search queries for planning
  const queriesResult = await writerModel.invoke([
    new SystemMessage(systemInstructionsQuery),
    new HumanMessage("Generate search queries on the provided topic."),
  ]);
  
  // Parse the result to get queries
  const queriesText = typeof queriesResult.content === 'string' 
    ? queriesResult.content 
    : JSON.stringify(queriesResult.content);
  
  console.log(`[DEBUG] 生成されたクエリレスポンス:`, queriesText);
  
  let queries = [];
  try {
    // まずJSON形式として解析を試みる
    const queriesData = JSON.parse(queriesText);
    
    if (queriesData.queries && Array.isArray(queriesData.queries)) {
      queries = queriesData.queries;
    } else if (Array.isArray(queriesData) && queriesData.length > 0) {
      // 配列として直接返された場合
      queries = queriesData;
    } else {
      // オブジェクトの中のいずれかのプロパティにクエリが含まれている可能性を確認
      for (const key in queriesData) {
        if (Array.isArray(queriesData[key]) && queriesData[key].length > 0) {
          queries = queriesData[key];
          break;
        }
      }
    }
    
    console.log(`[DEBUG] 解析されたクエリ:`, JSON.stringify(queries, null, 2));
    
    // クエリのフィールド名を確認し、正規化
    if (queries.length > 0) {
      if (typeof queries[0] === 'string') {
        // 文字列の配列の場合
        queries = queries.map((q: string) => ({ search_query: q }));
      } else if (typeof queries[0] === 'object') {
        // オブジェクトの配列の場合、有効なフィールド名を探す
        const validFields = ['search_query', 'searchQuery', 'query', 'text', 'q'];
        queries = queries.map((item: Record<string, unknown>) => {
          for (const field of validFields) {
            if (item[field]) {
              return { search_query: item[field] as string };
            }
          }
          // フィールドが見つからない場合、オブジェクト自体を文字列化
          return { search_query: JSON.stringify(item) };
        });
      }
    }
    
    // クエリが空の場合、デフォルトクエリを設定
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      console.log("[DEBUG] クエリの解析に失敗したため、デフォルトクエリを使用します");
      queries = [
        { search_query: `${topic} overview` },
        { search_query: `${topic} explanation` },
        { search_query: `${topic} guide` }
      ];
    }
  } catch (error) {
    console.error("[DEBUG] クエリの解析に失敗:", error);
    console.log("[DEBUG] クエリの解析に失敗したため、デフォルトクエリを使用します");
    queries = [
      { search_query: `${topic} overview` },
      { search_query: `${topic} explanation` },
      { search_query: `${topic} guide` }
    ];
  }

  // Execute search for each query
  const queryList = queries.map(q => q.search_query).filter(Boolean);
  
  // クエリリストをログに出力
  console.log("[DEBUG] 検索クエリリスト:", queryList);
  
  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("トピックに関する情報を検索しています...");
  }

  // Search the web with parameters
  console.log(`[DEBUG] 検索実行: API=${searchApi}, クエリ数=${queryList.length}`);
  const results = await selectAndExecuteSearch(searchApi, queryList, searchApiConfig);
  console.log(`[DEBUG] 検索結果: ${results.length}件取得`);
  
  const formattedResults = formatSearchResults(results);
  console.log(`[DEBUG] フォーマット済み検索結果長: ${formattedResults.length}文字`);

  // Format system instructions for plan generation
  const systemInstructions = reportPlannerInstructions.replace(
    "{topic}", topic
  ).replace(
    "{reportStructure}", reportStructure
  ).replace(
    "{context}", formattedResults
  ).replace(
    "{feedback}", feedback || "No feedback provided."
  );

  console.log(`[DEBUG] プラン生成用システムプロンプト長: ${systemInstructions.length}文字`);

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("リサーチプランを作成しています...");
  }

  // Generate report plan
  const plannerProvider = getConfigValue(configurable.plannerProvider);
  const plannerModelName = getConfigValue(configurable.plannerModel);
  const plannerModel = initChatModel(plannerModelName, plannerProvider);
  
  // Report planner message
  const plannerMessage = "Generate the sections of the report. Your response must include a 'sections' field containing a list of sections. " +
                        "Each section must have: name, description, plan, research, and content fields.";
  
  console.log(`[DEBUG] プランナーモデル呼び出し: ${plannerModelName}`);
  const sectionsResult = await plannerModel.invoke([
    new SystemMessage(systemInstructions),
    new HumanMessage(plannerMessage),
  ]);

  // Extract content from the result
  const contentStr = typeof sectionsResult.content === 'string'
    ? sectionsResult.content
    : JSON.stringify(sectionsResult.content);
  
  console.log(`[DEBUG] セクション生成結果長: ${contentStr.length}文字`);
  console.log(`[DEBUG] セクション生成結果内容: ${contentStr.substring(0, 500)}...`);
  
  try {
    // コンテンツをJSONとして解析してみる
    let contentData: Record<string, any>;
    try {
      // 制御文字を除去してからJSONとして解析
      const sanitizedContentStr = contentStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      contentData = JSON.parse(sanitizedContentStr);
      console.log(`[DEBUG] コンテンツをJSONとして解析成功`);
    } catch (jsonError) {
      // JSON解析に失敗した場合は、テキストそのものをコンテンツとして使用
      console.log("[DEBUG] コンテンツのJSON解析に失敗しました。テキストをそのまま使用します。", jsonError);
      contentData = { content: contentStr };
    }
    
    // Check if we have a valid sections array
    let sections = [];
    
    if (contentData.sections && Array.isArray(contentData.sections)) {
      sections = contentData.sections;
    } else {
      // Check if any field contains the sections array
      for (const key in contentData) {
        if (Array.isArray(contentData[key]) && contentData[key].length > 0) {
          // このフィールドがセクションの配列である可能性がある
          if (contentData[key][0].name || contentData[key][0].title) {
            sections = contentData[key];
            break;
          }
        }
      }
      
      // それでもセクションが見つからない場合、コンテンツ全体を1つのセクションとして扱う
      if (sections.length === 0) {
        console.log(`[DEBUG] セクションが見つからないため、デフォルトセクションを作成します`);
        sections = [
          {
            name: "概要",
            description: `${topic}の概要`,
            plan: "トピックの基本情報を収集し、説明する",
            research: true,
            content: ""
          },
          {
            name: "詳細分析",
            description: `${topic}の詳細な分析`,
            plan: "トピックに関する詳細情報を収集し、分析する",
            research: true,
            content: ""
          },
          {
            name: "結論",
            description: `${topic}に関する結論`,
            plan: "分析結果に基づいて結論をまとめる",
            research: true,
            content: ""
          }
        ];
      }
    }
    
    // セクションの標準化 - 必要なフィールドがない場合はデフォルト値を設定
    sections = sections.map((section: Record<string, unknown>) => {
      // titleフィールドがある場合はnameにマッピング
      const name = (section.name as string) || (section.title as string) || "無題のセクション";
      const description = (section.description as string) || `${name}に関する情報`;
      
      return {
        name,
        description,
        plan: (section.plan as string) || `${name}に関する情報を収集する`,
        research: section.research !== undefined ? Boolean(section.research) : true,
        content: (section.content as string) || ""
      };
    });
    
    console.log(`[DEBUG] 解析されたセクション数: ${sections.length}`);
    if (sections.length > 0) {
      console.log(`[DEBUG] 最初のセクション: ${JSON.stringify(sections[0], null, 2)}`);
    }
    
    // Return command with sections
    return { sections };
    
  } catch (error) {
    console.error("[DEBUG] セクション解析エラー:", error);
    // Default sections if parsing fails
    const defaultSections = [
      {
        name: "概要",
        description: `${topic}の概要`,
        plan: "トピックの基本情報を収集し、説明する",
        research: true,
        content: ""
      },
      {
        name: "詳細分析",
        description: `${topic}の詳細な分析`,
        plan: "トピックに関する詳細情報を収集し、分析する",
        research: true,
        content: ""
      },
      {
        name: "結論",
        description: `${topic}に関する結論`,
        plan: "分析結果に基づいて結論をまとめる",
        research: true,
        content: ""
      }
    ];
    
    console.log(`[DEBUG] デフォルトセクションを使用: ${defaultSections.length}セクション`);
    return { sections: defaultSections };
  }
}

/**
 * テキストから構造化されたセクションを抽出するヘルパー関数
 */
function extractSectionsFromText(text: string, topic: string): Section[] {
  console.log(`[DEBUG] テキストからセクションを抽出しています...`);
  
  // セクションのヘッダーを検出するための正規表現
  const sectionHeaderRegex = /(?:^|\n)#+\s+(.+?)(?:\n|$)/g;
  const sections: Section[] = [];
  
  let match;
  while ((match = sectionHeaderRegex.exec(text)) !== null) {
    const sectionName = match[1].trim();
    // セクション名が有効な場合のみ追加
    if (sectionName && !sectionName.includes('概要') && !sectionName.includes('まとめ') && sectionName.length < 100) {
      sections.push({
        name: sectionName,
        description: `${topic}の${sectionName}について`,
        research: true,
        content: ""
      });
    }
  }
  
  // セクションが見つからなかった場合はデフォルトのセクションを返す
  if (sections.length === 0) {
    return [{
      name: "概要",
      description: `${topic}の概要`,
      research: true,
      content: ""
    }];
  }
  
  return sections;
}

/**
 * Process human feedback on the report plan.
 */
function humanFeedback(state: ReportState) {
  // Get sections
  const topic = state.topic;
  const sections = state.sections;
  const sectionsStr = sections.map(
    section => `Section: ${section.name}\nDescription: ${section.description}\nResearch needed: ${section.research ? 'Yes' : 'No'}`
  ).join("\n\n");

  console.log(`[DEBUG] フィードバック処理: セクション数=${sections.length}, フィードバック有無=${!!state.feedback_on_report_plan}`);

  // In the TypeScript version, we'll use a simpler approach since we don't have interactivity
  // We'll check if there's feedback; if so, regenerate the plan, otherwise proceed
  if (state.feedback_on_report_plan) {
    console.log(`[DEBUG] フィードバックあり: プラン再生成へ遷移`);
    // Return to generate_report_plan with feedback
    return new Command({
      goto: "generate_report_plan",
      update: {
        feedback_on_report_plan: state.feedback_on_report_plan
      }
    });
  } else {
    // Proceed to process sections that need research
    const researchSections = sections.filter(s => s.research);
    console.log(`[DEBUG] 調査が必要なセクション数: ${researchSections.length}`);
    
    if (researchSections.length === 0) {
      console.log(`[DEBUG] 調査が必要なセクションなし: セクション収集へ遷移`);
      // If no sections need research, go straight to gathering sections
      return new Command({
        goto: "gather_completed_sections"
      });
    }
    
    console.log(`[DEBUG] セクション処理へ遷移`);
    // Otherwise, start researching each section in sequence
    return new Command({
      goto: "process_sections"
    });
  }
}

/**
 * Generate search queries for researching a specific section.
 */
async function generateQueries(state: SectionState, config: RunnableConfig) {
  console.log(`[DEBUG] クエリ生成: セクション="${state.section.name}"`);
  
  // Get state
  const topic = state.topic;
  const section = state.section;

  // Get configuration
  const configurable = Configuration.fromRunnableConfig(config);
  const numberOfQueries = configurable.numberOfQueries;

  // Generate queries
  const writerProvider = getConfigValue(configurable.writerProvider);
  const writerModelName = getConfigValue(configurable.writerModel);
  const writerModel = initChatModel(writerModelName, writerProvider);

  // Format system instructions
  const systemInstructions = queryWriterInstructions.replace(
    "{topic}", topic
  ).replace(
    "{sectionName}", section.name
  ).replace(
    "{sectionDescription}", section.description
  ).replace(
    "{currentFindings}", state.source_str || "No current findings yet."
  ).replace(
    "{numberOfQueries}", numberOfQueries.toString()
  );

  console.log(`[DEBUG] クエリ生成用システムプロンプト長: ${systemInstructions.length}文字`);

  try {
    // Generate queries
    console.log(`[DEBUG] クエリ生成モデル呼び出し: ${writerModelName}`);
    const queriesResult = await writerModel.invoke([
      new SystemMessage(systemInstructions),
      new HumanMessage(`Generate ${numberOfQueries} search queries about ${topic}, focusing on the section "${section.name}". Return as JSON with a "queries" array containing objects with "search_query" field.`),
    ]);

    // Parse the result to get queries
    const queriesText = typeof queriesResult.content === 'string' 
      ? queriesResult.content 
      : JSON.stringify(queriesResult.content);
    
    console.log(`[DEBUG] 生成されたクエリレスポンス長: ${queriesText.length}文字`);
    console.log(`[DEBUG] 生成されたクエリ内容: ${queriesText.substring(0, 200)}...`);
    
    try {
      // 最適なフォーマットで解析を試みる
      const queriesData = JSON.parse(queriesText);
      
      // クエリの配列を見つける
      let queries = [];
      if (queriesData.queries && Array.isArray(queriesData.queries)) {
        queries = queriesData.queries;
      } else if (Array.isArray(queriesData)) {
        queries = queriesData;
      } else {
        // オブジェクトのプロパティを探す
        for (const key in queriesData) {
          if (Array.isArray(queriesData[key])) {
            queries = queriesData[key];
            break;
          }
        }
      }
      
      // 正規化
      const normalizedQueries = queries.map((q: Record<string, unknown>) => {
        if (typeof q === 'string') {
          return { search_query: q };
        }
        
        // 異なるプロパティ名をチェック
        for (const field of ['search_query', 'searchQuery', 'query', 'q', 'text']) {
          if (q[field]) {
            return { search_query: q[field] as string };
          }
        }
        
        // プロパティがない場合はオブジェクト自体を使用
        return { search_query: typeof q === 'string' ? q : JSON.stringify(q) };
      });
      
      console.log(`[DEBUG] 解析されたクエリ数: ${normalizedQueries.length}`);
      
      // クエリがあれば返す、なければデフォルトを生成
      if (normalizedQueries.length > 0) {
        return { search_queries: normalizedQueries };
      }
    } catch (error) {
      console.error(`[DEBUG] クエリJSONの解析に失敗: ${error}`);
      // 解析エラー時は下のデフォルトクエリを使用
    }
  } catch (error) {
    console.error(`[DEBUG] クエリ生成中にエラーが発生: ${error}`);
    // エラー時はデフォルトクエリを使用
  }
  
  // デフォルトクエリの生成
  console.log(`[DEBUG] デフォルトクエリを生成します`);
  const defaultQueries = [
    { search_query: `${topic} ${section.name}` },
    { search_query: `${section.name} ${section.description}` },
    { search_query: `${topic} ${section.name} explained` }
  ];
  
  return { search_queries: defaultQueries };
}

/**
 * Execute web searches using generated queries.
 */
async function searchWeb(state: SectionState, config: RunnableConfig) {
  console.log(`[DEBUG] Web検索実行: セクション="${state.section.name}", 検索回数=${state.search_iterations}`);
  
  // State variables
  const search_queries = state.search_queries || [];
  
  console.log(`[DEBUG] 検索クエリ数: ${search_queries.length}`);
  
  // Get configuration
  const configurable = Configuration.fromRunnableConfig(config);
  
  // 進捗状況を通知
  const progressCallback = config.configurable?.progressCallback as ((message: string) => Promise<void>) | undefined;
  
  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback(`検索クエリ: ${search_queries.map((q: SearchQuery) => q.search_query).join(", ")}`);
  }
  
  const searchApi = configurable.searchApi || process.env.SEARCH_API || "tavily";
  
  // 検索を実行
  console.log(`[DEBUG] 検索実行: API=${searchApi}`);
  
  let results: SearchResult[] = [];
  
  try {
    if (search_queries.length > 0) {
      // 各クエリの処理
      for (const queryObj of search_queries) {
        // クエリの取得
        let query = queryObj.search_query;
        
        // クエリが空の場合はスキップまたはデフォルトクエリを使用
        if (!query || query.trim() === '') {
          console.log('[DEBUG] 空のクエリをスキップするか、デフォルトクエリを使用します');
          
          // デフォルトクエリを定義
          const defaultQuery = `${state.topic} ${state.section.name}`;
          console.log(`[DEBUG] デフォルトクエリを使用: ${defaultQuery}`);
          
          // 検索API用の設定パラメータを取得
          const searchParams = getSearchParams(searchApi, configurable.searchApiConfig as SearchApiConfigOptions);
          
          // 検索を実行
          results = await selectAndExecuteSearch(searchApi, defaultQuery, searchParams);
        } else {
          // 検索API用の設定パラメータを取得
          const searchParams = getSearchParams(searchApi, configurable.searchApiConfig as SearchApiConfigOptions);
          
          // 通常検索を実行
          results = await selectAndExecuteSearch(searchApi, query, searchParams);
        }
      }
    } else {
      // クエリがない場合はデフォルトクエリを使用
      const defaultQuery = `${state.topic} ${state.section.name}`;
      console.log(`[DEBUG] デフォルトクエリを生成します`);
      
      // 検索API用の設定パラメータを取得
      const searchParams = getSearchParams(searchApi, configurable.searchApiConfig as SearchApiConfigOptions);
      
      // 検索を実行
      if (searchApi === "tavily") {
        results = await selectAndExecuteSearch(searchApi, defaultQuery, searchParams);
      }
    }
  } catch (error) {
    console.error('[DEBUG] 検索実行中にエラーが発生:', error);
  }
  
  console.log(`[DEBUG] 検索結果: ${results.length}件取得`);
  
  // Format results for the section writer
  const formattedResults = formatSearchResults(results);
  
  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback(`${results.length}件の検索結果を取得しました`);
  }
  
  // Return search results
  return { 
    source_str: formattedResults,
    search_iterations: state.search_iterations + 1
  };
}

/**
 * Write a section based on search results.
 */
async function writeSection(state: SectionState, config: RunnableConfig) {
  console.log(`[DEBUG] セクション執筆: セクション="${state.section.name}", 検索回数=${state.search_iterations}`);
  
  // Get state
  const topic = state.topic;
  const section = state.section;
  const sourceText = state.source_str;
  
  // Get configuration
  const configurable = Configuration.fromRunnableConfig(config);

  // Format input prompt
  const systemInstructions = sectionWriterInstructions.replace(
    "{topic}", topic
  ).replace(
    "{sectionName}", section.name
  ).replace(
    "{sectionDescription}", section.description
  );
  
  console.log(`[DEBUG] セクション執筆用入力プロンプト長: ${systemInstructions.length}文字`);
  console.log(`[DEBUG] ソース情報長: ${sourceText.length}文字`);
  
  // Generate content
  const writerProvider = getConfigValue(configurable.writerProvider);
  const writerModelName = getConfigValue(configurable.writerModel);
  const writerModel = initChatModel(writerModelName, writerProvider);
  
  console.log(`[DEBUG] セクション執筆モデル呼び出し: ${writerModelName}`);
  
  let contentResult;
  try {
    contentResult = await writerModel.invoke([
      new SystemMessage(systemInstructions),
      new HumanMessage(`Write the "${section.name}" section based on the sources provided below. Include a JSON field named "content" with your response.

Sources:
${sourceText || "No sources provided. Generate content based on general knowledge."}`),
    ]);
  } catch (error) {
    console.error(`[DEBUG] セクション執筆中にエラーが発生: ${error}`);
    // エラー時はデフォルトのメッセージを作成
    return new Command({
      update: {
        section: {
          ...section,
          content: `${section.name}に関する情報が見つかりませんでした。`
        },
      },
      goto: END
    });
  }
  
  // Extract the content
  const contentStr = typeof contentResult.content === 'string' 
    ? contentResult.content 
    : JSON.stringify(contentResult.content);
  
  console.log(`[DEBUG] セクション「${section.name}」の生成されたコンテンツ長: ${contentStr.length}文字`);
  console.log(`[DEBUG] セクション「${section.name}」の生成されたコンテンツプレビュー:`, contentStr.substring(0, 200) + "...");
    
  try {
    // コンテンツをJSONとして解析してみる
    let contentData: Record<string, any>;
    try {
      // 制御文字を除去してからJSONとして解析
      const sanitizedContentStr = contentStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      contentData = JSON.parse(sanitizedContentStr);
      console.log(`[DEBUG] コンテンツをJSONとして解析成功`);
    } catch (jsonError) {
      // JSON解析に失敗した場合は、テキストそのものをコンテンツとして使用
      console.log("[DEBUG] コンテンツのJSON解析に失敗しました。テキストをそのまま使用します。", jsonError);
      contentData = { content: contentStr };
    }
    
    // Update the section with the content
    const updatedSection = {
      ...section,
      content: contentData.content || contentStr,
    };
    
    console.log(`[DEBUG] 更新されたセクションコンテンツ長: ${updatedSection.content.length}文字`);
    console.log(`[DEBUG] 更新されたセクションコンテンツプレビュー:`, updatedSection.content.substring(0, 200) + "...");
    
    // Get feedback on the section
    const feedbackSystemInstructions = sectionGraderInstructions.replace(
      "{topic}", topic
    ).replace(
      "{sectionName}", section.name
    ).replace(
      "{sectionDescription}", section.description
    );
    
    console.log(`[DEBUG] セクション評価用システムプロンプト長: ${feedbackSystemInstructions.length}文字`);
    
    const evaluatorProvider = getConfigValue(configurable.plannerProvider);
    const evaluatorModelName = getConfigValue(configurable.plannerModel);
    const evaluatorModel = initChatModel(evaluatorModelName, evaluatorProvider);
    
    console.log(`[DEBUG] セクション評価モデル呼び出し: ${evaluatorModelName}`);
    
    const feedbackResult = await evaluatorModel.invoke([
      new SystemMessage(feedbackSystemInstructions),
      new HumanMessage(`
Topic: ${topic}
Section Name: ${section.name}
Section Description: ${section.description}
Content: ${updatedSection.content}

Does this content fulfill the requirements for this section?
Respond with a JSON object with the following format:
{
  "grade": "pass" or "fail",
  "follow_up_queries": [
    {"search_query": "query 1"},
    {"search_query": "query 2"}
  ]
}
`),
    ]);
    
    const feedbackStr = typeof feedbackResult.content === 'string' 
      ? feedbackResult.content 
      : JSON.stringify(feedbackResult.content);
    
    console.log(`[DEBUG] セクション評価結果長: ${feedbackStr.length}文字`);
    
    try {
      // ここでfeedbackStrからJSONを抽出（最初の { から最後の } までを探す）
      const jsonMatch = feedbackStr.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : feedbackStr;
      
      // 抽出したJSONを解析
      const feedback: Feedback = JSON.parse(jsonStr);
      console.log(`[DEBUG] セクション評価: grade=${feedback.grade}, フォローアップクエリ数=${feedback.follow_up_queries?.length || 0}`);
      
      // 進捗状況を通知
      const progressCallback = config.configurable?.progressCallback as ((message: string) => Promise<void>) | undefined;
      
      // If the section is passing or the max search depth is reached, publish the section
      if (feedback.grade === "pass" || state.search_iterations >= configurable.maxSearchDepth) {
        console.log(`[DEBUG] セクション合格または最大検索深度到達: 完了へ遷移`);
        console.log(`[DEBUG] 完了セクションに追加: "${updatedSection.name}", 内容長=${updatedSection.content.length}`);
        // 進捗状況を通知
        if (progressCallback) {
          await progressCallback(`セクション「${section.name}」は合格しました`);
        }
        
        return new Command({
          update: {
            section: updatedSection,
            completed_sections: [updatedSection]
          },
          goto: END
        });
      } else {
        console.log(`[DEBUG] セクション不合格: さらなる調査が必要`);
        // 進捗状況を通知
        if (progressCallback) {
          await progressCallback(`セクション「${section.name}」はさらなる調査が必要です`);
        }
        // Update the existing section with new content and update search queries
        return new Command({
          update: {
            search_queries: feedback.follow_up_queries || [],
            section: updatedSection
          },
          goto: "generate_queries"
        });
      }
    } catch (error) {
      console.error("[DEBUG] フィードバックJSONの解析エラー:", error);
      // If we can't parse feedback, just complete the section
      console.log(`[DEBUG] フィードバック解析エラーのため、セクションを完了とします: "${updatedSection.name}", 内容長=${updatedSection.content.length}`);
      return new Command({
        update: {
          section: updatedSection,
          completed_sections: [updatedSection]
        },
        goto: END
      });
    }
  } catch (error) {
    console.error("[DEBUG] 一般的なエラーが発生:", error);
    // If we can't generate proper content, complete with what we have
    // or provide a simple message
    return new Command({
      update: {
        section: {
          ...section,
          content: `${section.name}に関する情報が見つかりませんでした。`
        },
      },
      goto: END
    });
  }
}

/**
 * Write sections that don't require research using completed sections as context.
 */
async function writeFinalSections(state: SectionState, config: RunnableConfig) {
  console.log(`[DEBUG] 最終セクション執筆: セクション="${state.section.name}"`);
  
  // Get configuration
  const configurable = Configuration.fromRunnableConfig(config);

  // Get state
  const topic = state.topic;
  const section = state.section;
  const completedReportSections = state.report_sections_from_research;

  // Format system instructions
  const systemInstructions = finalSectionWriterInstructions.replace(
    "{topic}", topic
  ).replace(
    "{sectionName}", section.name
  ).replace(
    "{sectionDescription}", section.description
  ).replace(
    "{researchMaterials}", completedReportSections || "No research materials available."
  );

  console.log(`[DEBUG] 最終セクション執筆用システムプロンプト長: ${systemInstructions.length}文字`);
  console.log(`[DEBUG] 研究資料長: ${completedReportSections ? completedReportSections.length : 0}文字`);

  // Generate section
  const writerProvider = getConfigValue(configurable.writerProvider);
  const writerModelName = getConfigValue(configurable.writerModel);
  const writerModel = initChatModel(writerModelName, writerProvider);

  console.log(`[DEBUG] 最終セクション執筆モデル呼び出し: ${writerModelName}`);
  const sectionContent = await writerModel.invoke([
    new SystemMessage(systemInstructions),
    new HumanMessage("Generate a report section based on the provided sources."),
  ]);

  // Extract content
  const contentStr = typeof sectionContent.content === 'string'
    ? sectionContent.content
    : JSON.stringify(sectionContent.content);

  console.log(`[DEBUG] 最終セクション「${section.name}」の生成されたコンテンツ長: ${contentStr.length}文字`);

  // Write content to section
  const updatedSection: Section = {
    ...section,
    content: contentStr,
  };

  // Write the updated section to completed sections
  return { completed_sections: [updatedSection] };
}

/**
 * Process all sections in sequence.
 */
async function processSections(state: ReportState, config?: RunnableConfig) {
  console.log(`[DEBUG] セクション処理開始: 総セクション数=${state.sections.length}`);
  const completedSections: Section[] = [...state.completed_sections];
  console.log(`[DEBUG] 既存の完了セクション数=${completedSections.length}`);
  
  // Get configuration
  const configurable = config ? Configuration.fromRunnableConfig(config) : new Configuration();
  const progressCallback = configurable.progressCallback;

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("セクションの処理を開始しています...");
  }
  
  // セクションごとに処理を実行
  for (const section of state.sections) {
    // 研究が必要ないセクションはスキップ
    if (!section.research) {
      console.log(`[DEBUG] 研究不要セクションをスキップ: "${section.name}"`);
      continue;
    }

    // 既に完了しているセクションはスキップ
    if (completedSections.some(s => s.name === section.name && s.content)) {
      console.log(`[DEBUG] 既に完了しているセクションをスキップ: "${section.name}"`);
      continue;
    }

    // 進捗状況を通知
    if (progressCallback) {
      await progressCallback(`セクション「${section.name}」の調査を開始しています...`);
    }

    console.log(`[DEBUG] セクション処理: "${section.name}"`);
    
    // セクション処理のための個別のグラフを作成
    try {
      console.log(`[DEBUG] セクショングラフ作成: "${section.name}"`);
      const sectionBuilder = new StateGraph<SectionState>({
        channels: {
          topic: {},
          section: {},
          search_queries: {},
          search_iterations: {
            default: () => 0
          },
          source_str: {},
          completed_sections: {
            default: () => []
          },
          report_sections_from_research: {},
          grade_result: {}
        }
      });

      // ノードの追加
      sectionBuilder.addNode("generate_queries", generateQueries);
      sectionBuilder.addNode("search_web", searchWeb);
      sectionBuilder.addNode("write_section", writeSection);

      // エッジの追加
      sectionBuilder.addEdge(START, "generate_queries");
      sectionBuilder.addEdge("generate_queries", "search_web");
      sectionBuilder.addEdge("search_web", "write_section");

      // サブグラフをコンパイル
      console.log(`[DEBUG] セクショングラフコンパイル: "${section.name}"`);
      const compiledSectionGraph = sectionBuilder.compile();

      // 初期状態を設定
      const initialSectionState: SectionState = {
        topic: state.topic,
        section,
        search_queries: [],
        search_iterations: 0,
        source_str: "",
        completed_sections: [],
        report_sections_from_research: ""
      };

      // セクションのサブグラフを実行
      console.log(`[DEBUG] セクショングラフ実行: "${section.name}"`);
      const sectionResult = await compiledSectionGraph.invoke(initialSectionState, config);
      
      // 完了したセクションを収集
      console.log(`[DEBUG] セクショングラフ実行結果:`, JSON.stringify({
        hasCompletedSections: !!sectionResult.completed_sections,
        completedSectionsLength: sectionResult.completed_sections ? sectionResult.completed_sections.length : 0,
        sectionName: sectionResult.section ? sectionResult.section.name : 'なし',
        sectionContentLength: sectionResult.section && sectionResult.section.content ? sectionResult.section.content.length : 0
      }, null, 2));
      
      // セクションの内容が生成されていれば、手動で完了セクションに追加
      if (sectionResult.section && sectionResult.section.content) {
        console.log(`[DEBUG] セクションの内容が見つかったため、完了セクションに追加: "${sectionResult.section.name}", 内容長=${sectionResult.section.content.length}`);
        
        const existingIndex = completedSections.findIndex(s => s.name === sectionResult.section.name);
        if (existingIndex >= 0) {
          console.log(`[DEBUG] 既存セクションを更新: "${sectionResult.section.name}"`);
          completedSections[existingIndex] = sectionResult.section;
        } else {
          console.log(`[DEBUG] 新規セクションを追加: "${sectionResult.section.name}"`);
          completedSections.push(sectionResult.section);
        }
      }
      
      // completed_sectionsフィールドから追加のセクションを収集
      if (sectionResult.completed_sections && sectionResult.completed_sections.length > 0) {
        console.log(`[DEBUG] 完了したセクション数: ${sectionResult.completed_sections.length}`);
        // Add the sections to our completed list
        for (const completedSection of sectionResult.completed_sections) {
          console.log(`[DEBUG] 完了セクションを処理: "${completedSection.name}", 内容長=${completedSection.content ? completedSection.content.length : 0}`);
          
          const existingIndex = completedSections.findIndex(s => s.name === completedSection.name);
          if (existingIndex >= 0) {
            console.log(`[DEBUG] 既存セクションを更新: "${completedSection.name}"`);
            completedSections[existingIndex] = completedSection;
          } else {
            console.log(`[DEBUG] 新規セクションを追加: "${completedSection.name}"`);
            completedSections.push(completedSection);
          }
        }

        // 進捗状況を通知
        if (progressCallback) {
          await progressCallback(`セクション「${section.name}」の執筆を完了しました`);
        }
      } else {
        console.log(`[DEBUG] 警告: セクション「${section.name}」は実行されましたが、完了セクションは生成されませんでした`);
      }
    } catch (error) {
      console.error(`[DEBUG] セクション処理エラー "${section.name}":`, error);
      
      // エラー発生時も進捗状況を通知
      if (progressCallback) {
        await progressCallback(`セクション「${section.name}」の処理中にエラーが発生しました`);
      }
      
      // エラーが発生しても、簡単な内容を持つセクションを作成して進める
      console.log(`[DEBUG] エラーが発生したため、デフォルト内容のセクションを作成: "${section.name}"`);
      const defaultSection = {
        ...section,
        content: `${section.name}に関する情報の収集中にエラーが発生しました。`
      };
      completedSections.push(defaultSection);
    }
  }

  console.log(`[DEBUG] 全セクション処理完了: 完了セクション数=${completedSections.length}`);
  console.log(`[DEBUG] 完了セクション詳細:`, JSON.stringify(completedSections.map(s => ({ 
    name: s.name, 
    contentLength: s.content ? s.content.length : 0,
    contentPreview: s.content ? s.content.substring(0, 50) + "..." : "内容なし"
  })), null, 2));

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("すべてのセクションの処理が完了しました");
  }

  return { completed_sections: completedSections };
}

/**
 * Format completed sections as context for writing final sections.
 */
function gatherCompletedSections(state: ReportState) {
  console.log(`[DEBUG] 完了セクション収集: 完了セクション数=${state.completed_sections.length}`);
  
  // Format completed section to str to use as context for final sections
  const completedReportSections = formatSections(state.completed_sections);
  console.log(`[DEBUG] フォーマット済み完了セクション長: ${completedReportSections.length}文字`);

  return { report_sections_from_research: completedReportSections };
}

/**
 * Create parallel tasks for writing non-research sections.
 */
function initiateFinalSectionWriting(state: ReportState) {
  console.log("Initiating final section writing");
  
  // Kick off section writing in parallel for any sections that do not require research
  const commands = state.sections
    .filter(s => !s.research)
    .map(s => 
      new Send("write_final_sections", {
        topic: state.topic,
        section: s,
        report_sections_from_research: state.report_sections_from_research,
      })
    );
  
  if (commands.length === 0) {
    // If no non-research sections, go directly to compile final report
    return ["compile_final_report"];
  }
  
  return commands;
}

/**
 * Compile all sections into the final report.
 */
function compileFinalReport(state: ReportState) {
  console.log("Compiling final report");
  
  // Get sections
  const sections = state.sections;
  console.log(`[DEBUG] セクション数: ${sections.length}`);
  console.log(`[DEBUG] セクション詳細:`, JSON.stringify(sections.map(s => ({ name: s.name, contentLength: s.content ? s.content.length : 0 })), null, 2));
  
  const completedSections = state.completed_sections.reduce((map, section) => {
    map[section.name] = section.content;
    return map;
  }, {} as Record<string, string>);
  
  console.log(`[DEBUG] 完了セクション数: ${state.completed_sections.length}`);
  console.log(`[DEBUG] 完了セクション詳細:`, JSON.stringify(state.completed_sections.map(s => ({ name: s.name, contentLength: s.content ? s.content.length : 0 })), null, 2));
  console.log(`[DEBUG] 完了セクションのマップ:`, JSON.stringify(Object.keys(completedSections), null, 2));

  // Update sections with completed content while maintaining original order
  const updatedSections = sections.map(section => {
    const hasContent = completedSections[section.name] !== undefined;
    console.log(`[DEBUG] セクション「${section.name}」の更新: 内容あり=${hasContent}, 内容長=${hasContent ? completedSections[section.name].length : 0}`);
    return {
      ...section,
      content: completedSections[section.name] || "Content not available",
    };
  });

  console.log(`[DEBUG] 更新後のセクション詳細:`, JSON.stringify(updatedSections.map(s => ({ name: s.name, contentLength: s.content ? s.content.length : 0, contentPreview: s.content.substring(0, 50) })), null, 2));

  // Compile final report
  const allSections = updatedSections.map(s => `# ${s.name}\n\n${s.content}`).join("\n\n");
  console.log(`[DEBUG] 最終レポート長: ${allSections.length}`);

  return { final_report: allSections };
}

/**
 * Build the report generation graph.
 */
export function buildReportGraph() {
  // Create the main report graph
  const builder = new StateGraph<ReportState>({
    channels: {
      topic: {},
      feedback_on_report_plan: {},
      sections: {},
      completed_sections: {
        default: () => []
      },
      report_sections_from_research: {},
      final_report: {}
    }
  });

  // Add nodes
  builder.addNode("generate_report_plan", generateReportPlan);
  builder.addNode("human_feedback", humanFeedback);
  builder.addNode("process_sections", processSections);
  builder.addNode("gather_completed_sections", gatherCompletedSections);
  builder.addNode("write_final_sections", writeFinalSections);
  builder.addNode("compile_final_report", compileFinalReport);

  // Add edges
  builder.addEdge(START, "generate_report_plan");
  builder.addEdge("generate_report_plan", "human_feedback");
  builder.addEdge("human_feedback", "process_sections");
  builder.addEdge("process_sections", "gather_completed_sections");
  builder.addConditionalEdges(
    "gather_completed_sections",
    initiateFinalSectionWriting,
    {
      "write_final_sections": "write_final_sections",
      "compile_final_report": "compile_final_report"
    }
  );
  builder.addEdge("write_final_sections", "compile_final_report");
  builder.addEdge("compile_final_report", END);

  return builder.compile();
}

/**
 * Execute report generation for a given topic.
 */
export async function executeReport(topic: string, config?: RunnableConfig): Promise<string> {
  // Initialize the graph
  console.log("Initializing report graph for topic:", topic);
  const reportGraph = buildReportGraph();
  
  // Get configuration for progress callback
  const configurable = config ? Configuration.fromRunnableConfig(config) : new Configuration();
  const progressCallback = configurable.progressCallback;
  
  // Prepare initial state
  const initialState: ReportState = {
    topic,
    feedback_on_report_plan: "",
    sections: [],
    completed_sections: [],
    report_sections_from_research: "",
    final_report: "",
  };
  
  try {
    // Execute the graph
    console.log("Executing report graph...");
    
    // 進捗状況を通知
    if (progressCallback) {
      await progressCallback("レポート生成を開始しています...");
    }
    
    const result = await reportGraph.invoke(initialState, config);
    
    // レポート結果のチェック
    if (!result.final_report || result.final_report.trim() === "") {
      console.error("空のレポートが生成されました。各セクションの状態をチェックします。");
      console.log("セクション数:", result.sections ? result.sections.length : 0);
      console.log("完了したセクション数:", result.completed_sections ? result.completed_sections.length : 0);
      
      if (result.sections && result.sections.length > 0) {
        result.sections.forEach((section, index) => {
          console.log(`セクション ${index + 1}:`, {
            name: section.name,
            contentLength: section.content ? section.content.length : 0,
            hasContent: !!section.content,
            research: section.research
          });
        });
      }
      
      // 空のレポートの場合は、デフォルトのメッセージを返す
      if (!result.final_report || result.final_report.trim() === "") {
        console.log("空のレポートに代わりにデフォルトメッセージを返します");
        return "申し訳ありませんが、指定されたトピックに関する情報を収集できませんでした。別のトピックで試してみてください。";
      }
    }
    
    // 進捗状況を通知
    if (progressCallback) {
      await progressCallback("レポートの最終調整を行っています...");
    }
    
    // Return the final report
    console.log("Report generation complete");
    console.log("レポート長:", result.final_report.length);
    
    // 進捗状況を通知
    if (progressCallback) {
      await progressCallback("レポート生成が完了しました");
    }
    
    return result.final_report;
  } catch (error) {
    console.error("Error executing report graph:", error);
    
    // エラー発生時も進捗状況を通知
    if (progressCallback) {
      await progressCallback("レポート生成中にエラーが発生しました");
    }
    
    throw error;
  }
} 