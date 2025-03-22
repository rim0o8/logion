// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Config } from "@/utils/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatDeepSeek } from "@langchain/deepseek";
import { Command, END, Send, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { Configuration, type SearchApiConfigOptions } from "./configuration";
import {
  finalSectionWriterInstructions,
  queryWriterInstructions,
  reportPlannerInstructions,
  reportPlannerQueryWriterInstructions,
  sectionWriterInstructions
} from "./prompts";
import type {
  ReportState,
  SearchQuery,
  Section,
  SectionState
} from "./state";
import { safeJsonParse } from "./textUtils";
import {
  type SearchResult,
  formatSearchResults,
  formatSections,
  getConfigValue,
  getSearchParams,
  selectAndExecuteSearch
} from "./utils";

// Helper to initialize chat model
function initChatModel(model: string, modelProvider: string) {
  console.log(`モデル初期化: provider=${modelProvider}, model=${model}`);
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
  console.log("レポートプラン生成開始: トピック=", state.topic);
  
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

  console.log(`設定: searchApi=${searchApi}, numberOfQueries=${numberOfQueries}`);

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
  
  let queries: unknown[] = [];
  try {
    // safeJsonParseを使用してJSONを解析
    const queriesData = safeJsonParse<Record<string, unknown> | unknown[]>(queriesText);
    
    // JSONの解析に失敗した場合は空の配列を使用
    if (queriesData === null) {
      console.log("クエリデータの解析に失敗しました。空の配列を使用します。");
      return [];
    }
    
    if (Array.isArray(queriesData)) {
      // 配列として直接返された場合
      queries = queriesData;
    } else if (typeof queriesData === 'object' && queriesData !== null) {
      // オブジェクト内のqueriesプロパティを探す
      const recordData = queriesData as Record<string, unknown>;
      if (Array.isArray(recordData.queries)) {
        queries = recordData.queries;
      } else {
        // オブジェクトの中のいずれかのプロパティにクエリが含まれている可能性を確認
        for (const key in recordData) {
          const value = recordData[key];
          if (Array.isArray(value) && value.length > 0) {
            queries = value;
            break;
          }
        }
      }
    }
    
    // クエリのフィールド名を確認し、正規化
    if (queries.length > 0) {
      if (typeof queries[0] === 'string') {
        // 文字列の配列の場合
        queries = queries.map((q) => {
          const queryStr = q as string;
          return { search_query: queryStr };
        });
      } else if (typeof queries[0] === 'object') {
        // オブジェクトの配列の場合、有効なフィールド名を探す
        const validFields = ['search_query', 'searchQuery', 'query', 'text', 'q'];
        queries = queries.map((item) => {
          const queryObj = item as Record<string, unknown>;
          for (const field of validFields) {
            if (queryObj[field]) {
              return { search_query: queryObj[field] as string };
            }
          }
          // フィールドが見つからない場合、オブジェクト自体を文字列化
          return { search_query: JSON.stringify(item) };
        });
      }
    }
    
    // クエリが空の場合、デフォルトクエリを設定
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      console.log("クエリの解析に失敗したため、デフォルトクエリを使用します");
      queries = [
        { search_query: `${topic} overview` },
        { search_query: `${topic} explanation` },
        { search_query: `${topic} guide` }
      ];
    }
  } catch (error) {
    console.error("クエリの解析に失敗:", error);
    console.log("クエリの解析に失敗したため、デフォルトクエリを使用します");
    queries = [
      { search_query: `${topic} overview` },
      { search_query: `${topic} explanation` },
      { search_query: `${topic} guide` }
    ];
  }

  // Execute search for each query
  const queryList = queries.map(q => {
    const queryObj = q as { search_query: string };
    return queryObj.search_query;
  }).filter(Boolean);
  
  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("トピックに関する情報を検索しています...");
  }
  // Search the web with parameters
  console.log(`検索実行: API=${searchApi}, クエリ数=${queryList.length}`);
  const results = await selectAndExecuteSearch(searchApi, queryList, searchApiConfig);
  console.log(`検索結果: ${results.length}件取得`);
  
  const formattedResults = formatSearchResults(results);

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
  
  console.log(`プランナーモデル呼び出し: ${plannerModelName}`);
  const sectionsResult = await plannerModel.invoke([
    new SystemMessage(systemInstructions),
    new HumanMessage(plannerMessage),
  ]);

  // Extract content from the result
  const contentStr = typeof sectionsResult.content === 'string'
    ? sectionsResult.content
    : JSON.stringify(sectionsResult.content);
  
  try {
    // コンテンツをJSONとして解析する - safeJsonParseを使用
    const contentData = safeJsonParse<Record<string, unknown> | unknown[]>(contentStr);
    
    // JSONの解析に失敗した場合
    if (contentData === null) {
      console.log("コンテンツデータの解析に失敗しました。プレーンテキストを解析します。");
      // プレーンテキストをMarkdownのセクションとして解釈
      try {
        const extractedSections = extractSectionsFromText(contentStr, topic);
        if (extractedSections.length > 0) {
          console.log(`プレーンテキストから${extractedSections.length}個のセクションを抽出しました`);
          return {
            ...state,
            sections: extractedSections
          };
        }
      } catch (e) {
        console.log("プレーンテキスト解析も失敗:", e);
      }
      
      // 解析に失敗した場合はデフォルトのセクションを使用
      return {
        ...state,
        sections: [
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
        ]
      };
    }
    
    // Check if we have a valid sections array
    let sectionsArray: unknown[] = [];
    
    // 配列が直接返された場合
    if (Array.isArray(contentData)) {
      console.log("コンテンツデータは直接配列です。セクションとして使用します。");
      sectionsArray = contentData;
    } 
    // オブジェクトの場合、sections配列を探す
    else if (typeof contentData === 'object' && contentData !== null) {
      const objData = contentData as Record<string, unknown>;
      // sectionsプロパティがある場合
      if (objData.sections && Array.isArray(objData.sections)) {
        sectionsArray = objData.sections;
      } else {
        // 他のプロパティで配列を探す
        for (const key in objData) {
          const value = objData[key];
          if (Array.isArray(value) && value.length > 0) {
            // このフィールドがセクションの配列である可能性がある
            const firstItem = value[0] as Record<string, unknown>;
            if (firstItem && (
              typeof firstItem.name === 'string' || 
              typeof firstItem.title === 'string' || 
              typeof firstItem.description === 'string'
            )) {
              sectionsArray = value;
              break;
            }
          }
        }
      }
    }
    
    // それでもセクションが見つからない場合、デフォルトセクションを使用
    if (sectionsArray.length === 0) {
      console.log("セクションが見つかりませんでした。デフォルトセクションを使用します。");
      return {
        ...state,
        sections: [
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
        ]
      };
    }
    
    // セクションの標準化 - 必要なフィールドがない場合はデフォルト値を設定
    const normalizedSections = sectionsArray.map((sectionData: unknown) => {
      // nullやundefinedの場合は空のオブジェクトとして扱う
      const sectionObj = (typeof sectionData === 'object' && sectionData !== null) 
        ? sectionData as Record<string, unknown>
        : {};
      
      // titleフィールドがある場合はnameにマッピング
      const name = (
        (typeof sectionObj.name === 'string' && sectionObj.name) || 
        (typeof sectionObj.title === 'string' && sectionObj.title) || 
        "無題のセクション"
      );
      
      const description = (
        (typeof sectionObj.description === 'string' && sectionObj.description) || 
        `${name}に関する情報`
      );
      
      const plan = (
        (typeof sectionObj.plan === 'string' && sectionObj.plan) || 
        `${name}に関する情報を収集する`
      );
      
      const research = sectionObj.research !== undefined ? Boolean(sectionObj.research) : true;
      
      const content = (typeof sectionObj.content === 'string' && sectionObj.content) || "";
      
      return {
        name,
        description,
        plan,
        research,
        content
      };
    });
    
    console.log(`解析されたセクション数: ${normalizedSections.length}`);
    
    // Return command with sections
    return {
      ...state, 
      sections: normalizedSections
    };
  } catch (error) {
    console.error("セクション解析エラー:", error);
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
    
    console.log(`デフォルトセクションを使用: ${defaultSections.length}セクション`);
    return { sections: defaultSections };
  }
}

/**
 * テキストから構造化されたセクションを抽出するヘルパー関数
 */
function /* eslint-disable @typescript-eslint/no-unused-vars */ extractSectionsFromText/* eslint-enable @typescript-eslint/no-unused-vars */(text: string, topic: string): Section[] {
  console.log("テキストからセクションを抽出しています...");
  
  // セクションのヘッダーを検出するための正規表現
  const sectionHeaderRegex = /(?:^|\n)#+\s+(.+?)(?:\n|$)/g;
  const sections: Section[] = [];
  
  // while文の割り当て式を修正
  let match: RegExpExecArray | null;
  match = sectionHeaderRegex.exec(text);
  while (match !== null) {
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
    match = sectionHeaderRegex.exec(text);
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
  // const topic = state.topic;
  const sections = state.sections;

  console.log(`フィードバック処理: セクション数=${sections.length}, フィードバック有無=${!!state.feedback_on_report_plan}`);

  // In the TypeScript version, we'll use a simpler approach since we don't have interactivity
  // We'll check if there's feedback; if so, regenerate the plan, otherwise proceed
  if (state.feedback_on_report_plan) {
    console.log("フィードバックあり: プラン再生成へ遷移");
    // Return to generate_report_plan with feedback
    return new Command({
      goto: "generate_report_plan",
      update: {
        feedback_on_report_plan: state.feedback_on_report_plan
      }
    });
  }
  
  // Proceed to process sections that need research
  const researchSections = sections.filter(s => s.research);
  console.log(`調査が必要なセクション数: ${researchSections.length}`);
  
  if (researchSections.length === 0) {
    console.log("調査が必要なセクションなし: セクション収集へ遷移");
    // If no sections need research, go straight to gathering sections
    return new Command({
      goto: "gather_completed_sections"
    });
  }
  
  console.log("セクション処理へ遷移");
  // Otherwise, start researching each section in sequence
  return new Command({
    goto: "process_sections"
  });
}

/**
 * Generate search queries for researching a specific section.
 */
async function generateQueries(state: SectionState, config: RunnableConfig) {
  console.log(`クエリ生成: セクション="${state.section.name}"`);
  
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

  try {
    // Generate queries
    console.log(`クエリ生成モデル呼び出し: ${writerModelName}`);
    const queriesResult = await writerModel.invoke([
      new SystemMessage(systemInstructions),
      new HumanMessage(`Generate ${numberOfQueries} search queries about ${topic}, focusing on the section "${section.name}". Return as JSON with a "queries" array containing objects with "search_query" field. Format must be: {"queries": [{"search_query": "query text"}, ...]}`),
    ]);

    // Parse the result to get queries
    const queriesText = typeof queriesResult.content === 'string' 
      ? queriesResult.content 
      : JSON.stringify(queriesResult.content);
    
    try {
      // safeJsonParseを使用してJSONを解析
      const queriesData = safeJsonParse<Record<string, unknown> | unknown[]>(queriesText);
      
      // JSONの解析に失敗した場合は空の配列を使用
      if (queriesData === null) {
        console.log("クエリデータの解析に失敗しました。デフォルトクエリを使用します。");
        return { 
          search_queries: [
            { search_query: `${topic} ${section.name}` },
            { search_query: `${section.name} ${section.description}` },
            { search_query: `${topic} ${section.name} explained` }
          ] 
        };
      }
      
      let queryItems: unknown[] = [];
      
      if (Array.isArray(queriesData)) {
        // 配列として直接返された場合
        queryItems = queriesData;
      } else if (typeof queriesData === 'object' && queriesData !== null) {
        // オブジェクト内のqueriesプロパティを探す
        const recordData = queriesData as Record<string, unknown>;
        if (Array.isArray(recordData.queries)) {
          queryItems = recordData.queries;
        } else {
          // オブジェクトの中のいずれかのプロパティにクエリが含まれている可能性を確認
          for (const key in recordData) {
            const value = recordData[key];
            if (Array.isArray(value) && value.length > 0) {
              queryItems = value;
              break;
            }
          }
        }
      }
      
      // クエリのフィールド名を確認し、正規化
      if (queryItems.length > 0) {
        const normalizedQueries: {search_query: string}[] = [];
        
        // 各アイテムをチェックして適切なクエリオブジェクトに変換
        for (const item of queryItems) {
          if (typeof item === 'string') {
            // 文字列の場合
            normalizedQueries.push({ search_query: item });
          } else if (typeof item === 'object' && item !== null) {
            // オブジェクトの場合、有効なフィールド名を探す
            const obj = item as Record<string, unknown>;
            const validFields = ['search_query', 'searchQuery', 'query', 'text', 'q'];
            
            let foundQueryField = false;
            for (const field of validFields) {
              if (field in obj && typeof obj[field] === 'string') {
                normalizedQueries.push({ search_query: obj[field] as string });
                foundQueryField = true;
                break;
              }
            }
            
            // フィールドが見つからない場合、オブジェクト自体を文字列化
            if (!foundQueryField) {
              normalizedQueries.push({ search_query: JSON.stringify(obj) });
            }
          } else if (item !== null && item !== undefined) {
            // その他の値（数値など）
            normalizedQueries.push({ search_query: String(item) });
          }
        }
        
        // 正規化されたクエリがあれば返す
        if (normalizedQueries.length > 0) {
          return { search_queries: normalizedQueries };
        }
      }
    } catch (error) {
      console.error(`クエリJSONの解析に失敗: ${error}`);
      // 解析エラー時は下のデフォルトクエリを使用
    }
  } catch (error) {
    console.error(`クエリ生成中にエラーが発生: ${error}`);
    // エラー時はデフォルトクエリを使用
  }
  
  // デフォルトクエリの生成
  console.log("デフォルトクエリを生成します");
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
  console.log(`Web検索実行: セクション="${state.section.name}", 検索回数=${state.search_iterations}`);
  
  // State variables
  const search_queries = state.search_queries || [];
  
  console.log(`検索クエリ数: ${search_queries.length}`);
  
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
  console.log(`検索実行: API=${searchApi}`);
  
  let results: SearchResult[] = [];
  
  try {
    if (search_queries.length > 0) {
      // 各クエリの処理
      for (const queryObj of search_queries) {
        // クエリの取得
        const query = queryObj.search_query;
        
        // クエリが空の場合はスキップまたはデフォルトクエリを使用
        if (!query || query.trim() === '') {
          console.log('空のクエリをスキップするか、デフォルトクエリを使用します');
          
          // デフォルトクエリを定義
          const defaultQuery = `${state.topic} ${state.section.name}`;
          console.log(`デフォルトクエリを使用: ${defaultQuery}`);
          
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
      console.log(`デフォルトクエリを生成します: ${defaultQuery}`);
      
      // 検索API用の設定パラメータを取得
      const searchParams = getSearchParams(searchApi, configurable.searchApiConfig as SearchApiConfigOptions);
      
      // 検索を実行
      if (searchApi === "tavily") {
        results = await selectAndExecuteSearch(searchApi, defaultQuery, searchParams);
      }
    }
  } catch (error) {
    console.error('検索実行中にエラーが発生:', error);
  }
  
  console.log(`検索結果: ${results.length}件取得`);
  
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
  console.log(`セクション執筆: セクション="${state.section.name}", 検索回数=${state.search_iterations}`);
  
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
  
  let contentResult: any;
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
    const defaultSection = {
      ...section,
      content: `${section.name}に関する情報が見つかりませんでした。`
    };
    console.log(`[DEBUG] エラー時のデフォルトセクション生成: 「${defaultSection.name}」, 内容長=${defaultSection.content.length}`);
    
    // 既存の完了セクションを維持
    const updatedCompletedSections = [...state.completed_sections, defaultSection];
    console.log(`[DEBUG] エラー時の完了セクション数: ${updatedCompletedSections.length}`);
    
    return new Command({
      update: {
        section: defaultSection,
        completed_sections: updatedCompletedSections
      },
      goto: END
    });
  }
  
  // Extract the content
  const contentStr = typeof contentResult.content === 'string' 
    ? contentResult.content 
    : JSON.stringify(contentResult.content);
  
  console.log(`[DEBUG] セクション「${section.name}」の生成されたコンテンツ長: ${contentStr.length}文字`);
  console.log(`[DEBUG] セクション「${section.name}」の生成されたコンテンツプレビュー: ${contentStr.substring(0, 200)}...`);
    
  try {
    // コンテンツをJSONとして解析する - safeJsonParseを使用
    const contentData = safeJsonParse<Record<string, unknown> | unknown[]>(contentStr);
    console.log("[DEBUG] セクション執筆結果データ:", contentData);
    
    // JSONの解析に失敗した場合
    if (contentData === null) {
      console.log("[DEBUG] セクション執筆結果の解析に失敗しました。元のコンテンツを使用します。");
      
      const updatedSection = {
        ...section,
        content: contentStr
      };
      
      // 既存の完了セクションを維持
      const updatedCompletedSections = [...state.completed_sections, updatedSection];
      console.log(`[DEBUG] JSON解析失敗時の完了セクション数: ${updatedCompletedSections.length}`);
      
      return new Command({
        update: {
          section: updatedSection,
          completed_sections: updatedCompletedSections
        },
        goto: END
      });
    }
    
    // 単純なテキスト応答の場合
    if (typeof contentData === 'string') {
      console.log("[DEBUG] セクション執筆結果は単純なテキストです");
      
      const updatedSection = {
        ...section,
        content: contentData
      };
      
      // 既存の完了セクションとマージ
      const updatedCompletedSections = [...state.completed_sections];
      const existingIndex = updatedCompletedSections.findIndex(s => 
        s.name.toLowerCase() === section.name.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        console.log(`[DEBUG] 既存の完了セクション[${existingIndex}]を更新: 「${section.name}」`);
        updatedCompletedSections[existingIndex] = updatedSection;
      } else {
        console.log(`[DEBUG] 新しい完了セクションを追加: 「${section.name}」`);
        updatedCompletedSections.push(updatedSection);
      }
      
      console.log(`[DEBUG] テキスト結果時の完了セクション数: ${updatedCompletedSections.length}`);
      
      return new Command({
        update: {
          section: updatedSection,
          completed_sections: updatedCompletedSections
        },
        goto: END
      });
    }
    
    // JSONオブジェクトの場合
    if (typeof contentData === 'object' && !Array.isArray(contentData)) {
      console.log("[DEBUG] セクション執筆結果はJSONオブジェクトです");
      
      // contentフィールドを探す
      if (contentData.content && typeof contentData.content === 'string') {
        console.log(`[DEBUG] JSONオブジェクトからcontentフィールドを抽出しました: 長さ=${contentData.content.length}`);
        
        const updatedSection = {
          ...section,
          content: contentData.content
        };
        
        // 既存の完了セクションとマージ
        const updatedCompletedSections = [...state.completed_sections];
        const existingIndex = updatedCompletedSections.findIndex(s => 
          s.name.toLowerCase() === section.name.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          console.log(`[DEBUG] 既存の完了セクション[${existingIndex}]を更新: 「${section.name}」`);
          updatedCompletedSections[existingIndex] = updatedSection;
        } else {
          console.log(`[DEBUG] 新しい完了セクションを追加: 「${section.name}」`);
          updatedCompletedSections.push(updatedSection);
        }
        
        console.log(`[DEBUG] JSONオブジェクト結果時の完了セクション数: ${updatedCompletedSections.length}`);
        
        return new Command({
          update: {
            section: updatedSection,
            completed_sections: updatedCompletedSections
          },
          goto: END
        });
      }
    }
    
    // 配列の場合
    if (Array.isArray(contentData)) {
      console.log("[DEBUG] セクション執筆結果は配列です");
      // 最初の要素がcontentを持っているか確認
      if (contentData.length > 0 && typeof contentData[0] === 'object' && contentData[0] !== null) {
        const firstItem = contentData[0] as Record<string, unknown>;
        if (firstItem.content && typeof firstItem.content === 'string') {
          console.log(`[DEBUG] 配列の最初の要素からcontentを抽出します: 長さ=${firstItem.content.length}`);
          
          const updatedSection = {
            ...section,
            content: firstItem.content
          };
          
          // 既存の完了セクションとマージ
          const updatedCompletedSections = [...state.completed_sections];
          const existingIndex = updatedCompletedSections.findIndex(s => 
            s.name.toLowerCase() === section.name.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            console.log(`[DEBUG] 既存の完了セクション[${existingIndex}]を更新: 「${section.name}」`);
            updatedCompletedSections[existingIndex] = updatedSection;
          } else {
            console.log(`[DEBUG] 新しい完了セクションを追加: 「${section.name}」`);
            updatedCompletedSections.push(updatedSection);
          }
          
          console.log(`[DEBUG] 配列結果時の完了セクション数: ${updatedCompletedSections.length}`);
          
          return new Command({
            update: {
              section: updatedSection,
              completed_sections: updatedCompletedSections
            },
            goto: END
          });
        }
      }
      
      // 配列全体を文字列化して使用
      console.log("[DEBUG] 配列からcontentを抽出できませんでした。配列を文字列化します");
      
      const updatedSection = {
        ...section,
        content: JSON.stringify(contentData, null, 2)
      };
      
      // 既存の完了セクションとマージ
      const updatedCompletedSections = [...state.completed_sections];
      const existingIndex = updatedCompletedSections.findIndex(s => 
        s.name.toLowerCase() === section.name.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        console.log(`[DEBUG] 既存の完了セクション[${existingIndex}]を更新: 「${section.name}」`);
        updatedCompletedSections[existingIndex] = updatedSection;
      } else {
        console.log(`[DEBUG] 新しい完了セクションを追加: 「${section.name}」`);
        updatedCompletedSections.push(updatedSection);
      }
      
      console.log(`[DEBUG] 配列文字列化時の完了セクション数: ${updatedCompletedSections.length}`);
      
      return new Command({
        update: {
          section: updatedSection,
          completed_sections: updatedCompletedSections
        },
        goto: END
      });
    }
    
    // それでもコンテンツが見つからない場合は元のテキストを使用
    console.log("[DEBUG] コンテンツが見つかりませんでした。元のテキストを使用します");
    
    const updatedSection = {
      ...section,
      content: contentStr
    };
    
    // 既存の完了セクションとマージ
    const updatedCompletedSections = [...state.completed_sections];
    const existingIndex = updatedCompletedSections.findIndex(s => 
      s.name.toLowerCase() === section.name.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      console.log(`[DEBUG] 既存の完了セクション[${existingIndex}]を更新: 「${section.name}」`);
      updatedCompletedSections[existingIndex] = updatedSection;
    } else {
      console.log(`[DEBUG] 新しい完了セクションを追加: 「${section.name}」`);
      updatedCompletedSections.push(updatedSection);
    }
    
    console.log(`[DEBUG] デフォルト処理時の完了セクション数: ${updatedCompletedSections.length}`);
    
    return new Command({
      update: {
        section: updatedSection,
        completed_sections: updatedCompletedSections
      },
      goto: END
    });
  } catch (error) {
    console.error(`[DEBUG] セクション内容の処理中にエラーが発生: ${error}`);
    
    // エラー時はデフォルトのメッセージを使用
    const updatedSection = {
      ...section,
      content: `${section.name}に関する情報の処理中にエラーが発生しました。`
    };
    
    // 既存の完了セクションとマージ
    const updatedCompletedSections = [...state.completed_sections, updatedSection];
    console.log(`[DEBUG] 例外発生時の完了セクション数: ${updatedCompletedSections.length}`);
    
    return new Command({
      update: {
        section: updatedSection,
        completed_sections: updatedCompletedSections
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
  // 既存の完了セクションを維持
  const existingCompletedSections = state.completed_sections || [];

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
  console.log(`[DEBUG] 最終セクション内容プレビュー: ${contentStr.substring(0, 100)}...`);

  try {
    // コンテンツをJSONとして解析する
    const contentData = safeJsonParse<Record<string, unknown>>(contentStr);
    console.log("[DEBUG] 最終セクション解析結果:", contentData);
    
    // 更新するセクション
    let updatedSection: Section;
    
    if (contentData?.content && typeof contentData.content === 'string') {
      // JSONのcontent部分を使用
      updatedSection = {
        ...section,
        content: contentData.content
      };
      console.log(`[DEBUG] JSONフォーマットから内容を抽出しました: ${contentData.content.length}文字`);
    } else {
      // 元のテキストを使用
      updatedSection = {
        ...section,
        content: contentStr
      };
      console.log(`[DEBUG] JSON解析に失敗したため元のテキストを使用: ${contentStr.length}文字`);
    }
    
    console.log(`[DEBUG] 最終セクション「${updatedSection.name}」を完了セクションに追加: 内容長=${updatedSection.content.length}文字`);
    
    // 既存のセクションのインデックスを探す
    const existingIndex = existingCompletedSections.findIndex(s => 
      s.name.toLowerCase() === updatedSection.name.toLowerCase()
    );
    
    // 新しい完了セクション配列を作成
    const newCompletedSections = [...existingCompletedSections];
    
    // 既存のインデックスがあれば更新、なければ追加
    if (existingIndex >= 0) {
      console.log(`[DEBUG] 既存のセクションを更新: ${updatedSection.name}`);
      newCompletedSections[existingIndex] = updatedSection;
    } else {
      console.log(`[DEBUG] 新しいセクションを追加: ${updatedSection.name}`);
      newCompletedSections.push(updatedSection);
    }
    
    // 既存のセクションを保持しつつ、新しいセクションを追加
    return {
      section: updatedSection,
      completed_sections: newCompletedSections
    };
  } catch (error) {
    console.error(`[ERROR] 最終セクション解析中にエラー: ${error}`);
    
    // エラー時は元のテキストを使用
    const defaultSection = {
      ...section,
      content: contentStr
    };
    
    // 既存のセクションのインデックスを探す
    const existingIndex = existingCompletedSections.findIndex(s => 
      s.name.toLowerCase() === defaultSection.name.toLowerCase()
    );
    
    // 新しい完了セクション配列を作成
    const newCompletedSections = [...existingCompletedSections];
    
    // 既存のインデックスがあれば更新、なければ追加
    if (existingIndex >= 0) {
      console.log(`[DEBUG] (エラー時) 既存のセクションを更新: ${defaultSection.name}`);
      newCompletedSections[existingIndex] = defaultSection;
    } else {
      console.log(`[DEBUG] (エラー時) 新しいセクションを追加: ${defaultSection.name}`);
      newCompletedSections.push(defaultSection);
    }
    
    return {
      section: defaultSection,
      completed_sections: newCompletedSections
    };
  }
}

/**
 * Process all sections in sequence.
 */
async function processSections(state: ReportState, config?: RunnableConfig) {
  console.log(`[DEBUG] セクション処理開始: 総セクション数=${state.sections.length}`);
  console.log(`[DEBUG] セクション一覧:`, JSON.stringify(state.sections.map((s, idx) => ({
    index: idx,
    name: s.name,
    research: s.research,
    contentLength: s.content ? s.content.length : 0
  })), null, 2));
  
  const completedSections: Section[] = [...state.completed_sections];
  console.log(`[DEBUG] 既存の完了セクション数=${completedSections.length}`);
  console.log(`[DEBUG] 既存の完了セクション:`, JSON.stringify(completedSections.map((s, idx) => ({
    index: idx,
    name: s.name,
    contentLength: s.content ? s.content.length : 0
  })), null, 2));
  
  // Get configuration
  const configurable = config ? Configuration.fromRunnableConfig(config) : new Configuration();
  const progressCallback = configurable.progressCallback;

  // 進捗状況を通知
  if (progressCallback) {
    await progressCallback("セクションの処理を開始しています...");
  }
  
  // セクションごとに処理を実行
  for (let i = 0; i < state.sections.length; i++) {
    const section = state.sections[i];
    console.log(`[DEBUG] セクション[${i}]「${section.name}」の処理検討中...`);
    
    // 研究が必要ないセクションはスキップ
    if (!section.research) {
      console.log(`[DEBUG] 研究不要セクションをスキップ: セクション[${i}]「${section.name}」`);
      continue;
    }

    // 既に完了しているセクションはスキップ
    const existingIndex = completedSections.findIndex(s => 
      s.name.toLowerCase() === section.name.toLowerCase() && s.content
    );
    if (existingIndex >= 0) {
      console.log(`[DEBUG] 既に完了しているセクションをスキップ: セクション[${i}]「${section.name}」, 完了セクション[${existingIndex}]「${completedSections[existingIndex].name}」, 内容長=${completedSections[existingIndex].content ? completedSections[existingIndex].content.length : 0}`);
      continue;
    }

    // 進捗状況を通知
    if (progressCallback) {
      await progressCallback(`セクション「${section.name}」の調査を開始しています...`);
    }

    console.log(`[DEBUG] セクション[${i}]「${section.name}」の処理を開始します`);
    
    // セクション処理のための個別のグラフを作成
    try {
      console.log(`[DEBUG] セクショングラフ作成: セクション[${i}]「${section.name}」`);
      const sectionBuilder = new StateGraph({
        channels: {
          topic: { value: (x, y) => y },
          section: { value: (x, y) => y },
          search_queries: { value: (x, y) => y },
          search_iterations: {
            value: (x, y) => y,
            default: () => 0
          },
          source_str: { value: (x, y) => y },
          completed_sections: {
            value: (x, y) => y,
            default: () => []
          },
          report_sections_from_research: { value: (x, y) => y },
          grade_result: { value: (x, y) => y }
        }
      });

      // ノードの追加
      sectionBuilder.addNode("generate_queries", generateQueries);
      sectionBuilder.addNode("search_web", searchWeb);
      sectionBuilder.addNode("write_section", writeSection);

      // エッジの追加
      sectionBuilder.addEdge("__start__", "generate_queries");
      sectionBuilder.addEdge("generate_queries", "search_web");
      sectionBuilder.addEdge("search_web", "write_section");

      // サブグラフをコンパイル
      console.log(`[DEBUG] セクショングラフコンパイル: セクション[${i}]「${section.name}」`);
      const compiledSectionGraph = sectionBuilder.compile();

      // 初期状態を設定
      const initialSectionState = {
        topic: state.topic,
        section: section,
        search_iterations: 0,
        search_queries: [],
        source_str: "",
        report_sections_from_research: state.report_sections_from_research || "",
        completed_sections: completedSections
      };

      // セクションのサブグラフを実行
      console.log(`[DEBUG] セクショングラフ実行: セクション[${i}]「${section.name}」`);
      const sectionResult = await compiledSectionGraph.invoke(initialSectionState, config);
      
      // 完了したセクションを収集
      console.log(`[DEBUG] セクション[${i}]「${section.name}」グラフ実行結果:`, JSON.stringify({
        hasCompletedSections: !!sectionResult.completed_sections,
        completedSectionsLength: sectionResult.completed_sections ? sectionResult.completed_sections.length : 0,
        sectionName: sectionResult.section?.name || 'なし',
        sectionContentLength: sectionResult.section?.content ? sectionResult.section.content.length : 0
      }, null, 2));
      
      // セクションの内容が生成されていれば、手動で完了セクションに追加
      if (sectionResult.section?.content) {
        console.log(`[DEBUG] セクション[${i}]「${sectionResult.section.name}」の内容が見つかったため、完了セクションに追加: 内容長=${sectionResult.section.content.length}`);
        
        const existingIndex = completedSections.findIndex(s => 
          s.name.toLowerCase() === sectionResult.section.name.toLowerCase()
        );
        if (existingIndex >= 0) {
          console.log(`[DEBUG] 既存セクション[${existingIndex}]を更新: 「${sectionResult.section.name}」`);
          completedSections[existingIndex] = sectionResult.section;
        } else {
          console.log(`[DEBUG] 新規セクションを追加: 「${sectionResult.section.name}」`);
          completedSections.push(sectionResult.section);
        }
      } else {
        console.log(`[DEBUG] セクション[${i}]「${section.name}」の内容が生成されませんでした`);
      }
      
      // completed_sectionsフィールドから追加のセクションを収集
      if (sectionResult.completed_sections && sectionResult.completed_sections.length > 0) {
        console.log(`[DEBUG] セクション[${i}]の完了セクション数: ${sectionResult.completed_sections.length}`);
        // Add the sections to our completed list
        for (let j = 0; j < sectionResult.completed_sections.length; j++) {
          const completedSection = sectionResult.completed_sections[j];
          console.log(`[DEBUG] 完了セクション[${j}]「${completedSection.name}」を処理: 内容長=${completedSection.content ? completedSection.content.length : 0}`);
          
          const existingIndex = completedSections.findIndex(s => 
            s.name.toLowerCase() === completedSection.name.toLowerCase()
          );
          if (existingIndex >= 0) {
            console.log(`[DEBUG] 既存セクション[${existingIndex}]を更新: 「${completedSection.name}」`);
            completedSections[existingIndex] = completedSection;
          } else {
            console.log(`[DEBUG] 新規セクションを追加: 「${completedSection.name}」`);
            completedSections.push(completedSection);
          }
        }

        // 進捗状況を通知
        if (progressCallback) {
          await progressCallback(`セクション「${section.name}」の執筆を完了しました`);
        }
      } else {
        console.log(`[DEBUG] 警告: セクション[${i}]「${section.name}」は実行されましたが、完了セクションは生成されませんでした`);
      }
    } catch (error) {
      console.error(`[DEBUG] セクション[${i}]「${section.name}」処理エラー:`, error);
      
      // エラー発生時も進捗状況を通知
      if (progressCallback) {
        await progressCallback(`セクション「${section.name}」の処理中にエラーが発生しました`);
      }
      
      // エラーが発生しても、簡単な内容を持つセクションを作成して進める
      console.log(`[DEBUG] エラーが発生したため、デフォルト内容のセクションを作成: セクション[${i}]「${section.name}」`);
      const defaultSection = {
        ...section,
        content: `${section.name}に関する情報の収集中にエラーが発生しました。`
      };
      completedSections.push(defaultSection);
    }
  }

  console.log(`[DEBUG] 全セクション処理完了: 完了セクション数=${completedSections.length}`);
  console.log("[DEBUG] 完了セクション詳細:", JSON.stringify(completedSections.map((s, idx) => ({ 
    index: idx,
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
  console.log(`[DEBUG] 最終セクション執筆開始: sections=${state.sections.length}, completed_sections=${state.completed_sections.length}`);
  
  // すべてのセクションの状態を出力
  console.log(`[DEBUG] セクション一覧:`, JSON.stringify(state.sections.map((s, idx) => ({
    index: idx,
    name: s.name,
    research: s.research,
    hasContent: !!s.content,
    contentLength: s.content ? s.content.length : 0
  })), null, 2));
  
  // 研究不要なセクションだけを処理
  const nonResearchSections = state.sections.filter(s => !s.research);
  console.log(`[DEBUG] 研究不要セクション数: ${nonResearchSections.length}`);
  console.log(`[DEBUG] 研究不要セクション:`, JSON.stringify(nonResearchSections.map(s => s.name), null, 2));
  
  // 既存の完了セクションの名前を取得（大文字小文字を区別しない）
  const completedSectionNames = state.completed_sections.map(s => s.name.toLowerCase());
  console.log(`[DEBUG] 完了済みセクション名:`, JSON.stringify(completedSectionNames, null, 2));
  
  // まだ処理されていない研究不要セクションを特定
  const sectionsToProcess = nonResearchSections.filter(s => 
    !completedSectionNames.includes(s.name.toLowerCase())
  );
  console.log(`[DEBUG] 処理が必要なセクション数: ${sectionsToProcess.length}`);
  
  if (sectionsToProcess.length === 0) {
    // 処理が必要なセクションがない場合は直接最終レポート作成へ
    console.log(`[DEBUG] 処理が必要なセクションがないため、直接最終レポート作成へ進みます`);
    return ["compile_final_report"];
  }
  
  // セクション執筆タスクを生成（未処理のセクションのみ）
  const commands = sectionsToProcess.map(s => {
    console.log(`[DEBUG] 最終セクション執筆タスク作成: セクション「${s.name}」`);
    return new Send("write_final_sections", {
      topic: state.topic,
      section: s,
      report_sections_from_research: state.report_sections_from_research,
      // 既存の完了セクションも引き継ぐ
      completed_sections: [...state.completed_sections]
    });
  });
  
  return commands;
}

/**
 * Compile all sections into the final report.
 */
function compileFinalReport(state: ReportState) {
  console.log("Compiling final report");
  // Get sections
  const sections = state.sections;
  
  // 完了セクションの構造を詳細に確認
  console.log("[DEBUG] completed_sections の構造:", JSON.stringify({
    length: state.completed_sections.length,
    isArray: Array.isArray(state.completed_sections),
    prototype: Object.prototype.toString.call(state.completed_sections)
  }));
  
  // 完了セクションの最初の要素を詳細に表示（存在する場合）
  if (state.completed_sections.length > 0) {
    console.log("[DEBUG] 最初の完了セクションの詳細:", JSON.stringify({
      keys: Object.keys(state.completed_sections[0]),
      hasContent: !!state.completed_sections[0].content,
      contentType: typeof state.completed_sections[0].content,
      contentLength: state.completed_sections[0].content ? state.completed_sections[0].content.length : 0,
      contentPreview: state.completed_sections[0].content ? state.completed_sections[0].content.substring(0, 100) : "なし",
      name: state.completed_sections[0].name
    }, null, 2));
  }
  
  console.log("[DEBUG] 完了セクション数: " + state.completed_sections.length);
  console.log("[DEBUG] セクション数: " + sections.length);
  
  // セクション状態の詳細レポート
  console.log("[DEBUG] セクション詳細:", JSON.stringify(sections.map((s, idx) => ({
    index: idx,
    name: s.name,
    research: s.research,
    hasContent: !!s.content,
    contentLength: s.content ? s.content.length : 0,
    inCompletedSections: state.completed_sections.some(cs => cs.name.toLowerCase() === s.name.toLowerCase())
  })), null, 2));
  
  // 完了セクションの詳細を表示
  for (let i = 0; i < state.completed_sections.length; i++) {
    const section = state.completed_sections[i];
    console.log(`[DEBUG] 完了セクション[${i}]: ${section.name}, 内容長=${section.content ? section.content.length : 0}`);
    if (section.content) {
      console.log(`[DEBUG] 内容プレビュー: ${section.content.substring(0, 50)}...`);
    }
  }
  
  // 研究が不要なセクションで完了セクションに追加されていないものを追加する
  // ここが重要な修正ポイント
  const completedSectionNames = state.completed_sections.map(s => s.name.toLowerCase());
  const additionalSections: Section[] = [];
  
  // 元のセクションをループして、未処理の研究不要セクションを探す
  for (const section of sections) {
    // 完了セクションに含まれていない場合のみ処理
    if (!completedSectionNames.includes(section.name.toLowerCase())) {
      // 研究不要（research=false）のセクションは、内容が生成されていれば追加
      // 内容が生成されていない場合は追加しない（スキップする）
      if (section.content) {
        console.log(`[DEBUG] 未処理セクション「${section.name}」に内容があるため、最終レポートに含めます`);
        additionalSections.push({
          ...section,
          content: section.content
        });
      } else {
        console.log(`[DEBUG] 未処理セクション「${section.name}」には内容がないため、最終レポートには含めません`);
      }
    }
  }
  
  // 完了セクションと未処理セクションを結合
  const allCompletedSections = [...state.completed_sections, ...additionalSections];
  console.log(`[DEBUG] 最終的な完了セクション数: ${allCompletedSections.length}`);
  
  // 名前で完了セクションをマップに格納（大文字小文字を区別しない）
  const completedSectionsMap = new Map<string, Section>();
  for (const section of allCompletedSections) {
    // セクション名を小文字に変換して大文字小文字の違いを無視する
    // 内容が確実に存在するもののみマップに追加
    if (section.content && section.content.trim().length > 0) {
      completedSectionsMap.set(section.name.toLowerCase(), section);
    }
  }
  
  console.log("[DEBUG] 完了セクションのマップキー:", JSON.stringify(Array.from(completedSectionsMap.keys()), null, 2));

  // 元のセクション順序を維持しながら更新
  // 内容がある完了セクションだけをフィルタリング
  const updatedSections = sections
    .map(section => {
      // 完了セクションから対応するセクションを取得（大文字小文字を無視）
      const completedSection = completedSectionsMap.get(section.name.toLowerCase());
      
      console.log(`[DEBUG] セクション「${section.name}」の更新:`, JSON.stringify({
        found: !!completedSection,
        completedName: completedSection ? completedSection.name : "なし",
        hasContent: !!(completedSection?.content),
        contentLength: completedSection?.content ? completedSection.content.length : 0
      }));
      
      // 対応するセクションがあれば更新、なければnullを返す
      if (completedSection?.content) {
        return {
          ...section,
          content: completedSection.content
        };
      }
      return null;
    })
    .filter(section => section !== null) as Section[]; // nullを除外
  
  // 最終レポートをコンパイル
  const allSections = updatedSections.map(s => `# ${s.name}\n\n${s.content}`).join("\n\n");
  console.log(`[DEBUG] 最終レポート長: ${allSections.length}`);
  console.log("[DEBUG] 最終セクション内容プレビュー:", updatedSections.map(s => ({ 
    name: s.name,
    contentLength: s.content ? s.content.length : 0,
    contentPreview: s.content ? `${s.content.substring(0, 50)}...` : "なし"
  })));

  return { final_report: allSections };
}

/**
 * Build the report generation graph.
 */
export function buildReportGraph() {
  // Create the main report graph
  const builder = new StateGraph({
    channels: {
      topic: { value: (x: any, y: any) => y },
      feedback_on_report_plan: { value: (x: any, y: any) => y },
      sections: { value: (x: any, y: any) => y },
      completed_sections: {
        value: (x: any, y: any) => y,
        default: () => []
      },
      report_sections_from_research: { value: (x: any, y: any) => y },
      final_report: { value: (x: any, y: any) => y }
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
  builder.addEdge("__start__", "generate_report_plan" as any);
  builder.addEdge("generate_report_plan" as any, "human_feedback" as any);
  builder.addEdge("human_feedback" as any, "process_sections" as any);
  builder.addEdge("process_sections" as any, "gather_completed_sections" as any);
  builder.addConditionalEdges(
    "gather_completed_sections" as any,
    initiateFinalSectionWriting,
    {
      "write_final_sections": "write_final_sections",
      "compile_final_report": "compile_final_report"
    }
  );
  builder.addEdge("write_final_sections" as any, "compile_final_report" as any);
  builder.addEdge("compile_final_report" as any, "__end__" as any);

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
  const initialState = {
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
        result.sections.forEach((section: Section, index: number) => {
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