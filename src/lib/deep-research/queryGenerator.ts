import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { StateGraph } from "@langchain/langgraph";
import { initChatModel } from "./models";
import { queryWriterInstructions } from "./prompts";
import type { ResearchState } from "./state";
import { safeJsonParse } from "./textUtils";

/**
 * クエリ生成のプロンプトテンプレート
 */
const QUERY_TEMPLATE = queryWriterInstructions;

/**
 * クエリ生成チェーンを作成する
 * 
 * @param model - 使用するチャットモデル
 * @returns クエリ生成のためのチェーン
 */
export function createQueryChain(model: BaseChatModel) {
  const queryPrompt = PromptTemplate.fromTemplate(QUERY_TEMPLATE);
  return RunnableSequence.from([
    queryPrompt,
    model,
  ]).pipe(output => String(output.content));
}

/**
 * セクションに基づいて検索クエリを生成する
 * 
 * @param state - 現在の研究状態
 * @returns 更新された研究状態
 */
export async function generateQueries(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    console.log("[DEBUG] 検索クエリの生成を開始...");
    
    const { topic, sections, queryModel, queryModelProvider } = state;
    
    if (!sections || sections.length === 0) {
      console.error("[ERROR] クエリを生成するセクションがありません");
      return {
        error: "クエリを生成するセクションがありません",
        currentStep: "error",
      };
    }
    
    // デフォルトか指定されたモデルを使用
    const modelToUse = queryModel || state.planModel;
    const providerToUse = queryModelProvider || state.planModelProvider;
    
    // クエリ生成用のモデルを初期化
    const model = initChatModel(modelToUse, providerToUse);
    
    // クエリ生成チェーンを作成
    const queryChain = createQueryChain(model);
    
    // 各セクションに対してクエリを生成
    const searchQueries = [];
    
    for (const section of sections) {
      try {
        console.log(`[DEBUG] セクション「${section.name}」のクエリ生成を開始...`);
        
        // クエリを生成
        const queryContent = await queryChain.invoke({
          topic,
          sectionName: section.name,
          sectionDescription: section.description,
          numberOfQueries: 5,
          currentFindings: "",
        });
        
        const queryData = safeJsonParse<{ queries: Array<{ search_query: string }> }>(
          queryContent
        );
        
        // JSONの解析に失敗した場合、空の配列をデフォルトとして使用
        const queries = queryData?.queries || [];
        
        if (queries.length > 0) {
          // セクション名とクエリを関連付けて保存
          searchQueries.push({
            section: section.name,
            queries: queries.map(q => q.search_query),
          });
        }
        
        console.log(`[DEBUG] セクション「${section.name}」のクエリ生成が完了しました`);
      } catch (sectionError) {
        console.error(`[ERROR] セクション「${section.name}」のクエリ生成中にエラーが発生しました:`, sectionError);
        // エラーが発生したセクションには空のクエリリストを設定
        searchQueries.push({
          section: section.name,
          queries: [],
        });
      }
    }
    
    return {
      searchQueries,
      currentStep: "searchWeb",
    };
  } catch (error) {
    console.error("[ERROR] クエリ生成中にエラーが発生しました:", error);
    return {
      error: `クエリ生成中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "error",
    };
  }
}

/**
 * 状態グラフにクエリ生成ステップを追加する
 * 
 * @param graph - 状態グラフ
 * @returns 更新された状態グラフ
 */
export function addQueryGenerationToGraph(graph: StateGraph<ResearchState>) {
  // クエリ生成ノードを追加
  graph.addNode("generateQueries", RunnableSequence.from([generateQueries]));
  
  // エッジを追加
  graph.addConditionalEdges(
    "generateQueries",
    (state: ResearchState) => state.currentStep,
    {
      error: "error",
      searchWeb: "searchWeb",
    }
  );
  
  return graph;
} 