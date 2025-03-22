/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { StateGraph } from "@langchain/langgraph";
import type { ResearchState } from "./state";
import { formatSearchResults, getSearchParams, selectAndExecuteSearch } from "./utils";

/**
 * セクション・クエリのペアインターフェース
 */
interface SectionQueryPair {
  section: string;
  queries: string[];
}

/**
 * Web検索を実行する
 * 
 * @param state - 現在の研究状態
 * @returns 更新された研究状態
 */
export async function executeWebSearch(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    console.log("[DEBUG] Web検索の実行を開始...");
    
    // @ts-expect-error - ResearchStateの拡張が必要
    const { searchQueries } = state;
    
    if (!searchQueries || searchQueries.length === 0) {
      console.error("[ERROR] 検索クエリがありません");
      return {
        error: "検索クエリがありません",
        currentStep: "error",
      };
    }
    
    // 検索クエリのリストを作成（すべてのセクションからクエリを収集）
    const allQueries = searchQueries.flatMap((sq: SectionQueryPair) => sq.queries || []);
    
    if (allQueries.length === 0) {
      console.error("[ERROR] 有効な検索クエリがありません");
      return {
        error: "有効な検索クエリがありません",
        currentStep: "error",
      };
    }
    
    // 検索を実行
    console.log(`[DEBUG] ${allQueries.length}件のクエリで検索を実行します...`);

    // 検索パラメータを取得
    const searchParams = getSearchParams('tavily'); // デフォルトでtavilyを使用
    
    // 各クエリに対して検索を実行
    const searchResults = [];
    
    for (const query of allQueries) {
      try {
        console.log(`[DEBUG] クエリを実行: ${query}`);
        const results = await selectAndExecuteSearch('tavily', query, searchParams);
        
        if (results && results.length > 0) {
          // 結果を追加
          searchResults.push(...results);
        }
      } catch (error) {
        console.error(`[ERROR] クエリ「${query}」の検索中にエラーが発生しました:`, error);
      }
      
      // レート制限を避けるために少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.warn("[WARN] 検索結果がありませんでした");
      return {
        error: "検索結果がありませんでした",
        currentStep: "error",
      };
    }
    
    console.log(`[DEBUG] ${searchResults.length}件の検索結果を取得しました`);
    
    // 検索結果をフォーマット
    const formattedResults = formatSearchResults(searchResults);
    
    return {
      // @ts-ignore - ResearchStateの拡張が必要
      searchResults: formattedResults,
      currentStep: "writeSections",
    };
  } catch (error) {
    console.error("[ERROR] Web検索中にエラーが発生しました:", error);
    return {
      error: `Web検索中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "error",
    };
  }
}

/**
 * 状態グラフにWeb検索ステップを追加する
 * 
 * @param graph - 状態グラフ
 * @returns 更新された状態グラフ
 */
export function addWebSearchToGraph(graph: StateGraph<ResearchState>) {
  // Web検索ノードを追加
  // @ts-ignore - StateGraph型定義の問題を回避
  graph.addNode("searchWeb", executeWebSearch);
  
  // エッジを追加
  // @ts-ignore - StateGraph型定義の問題を回避
  graph.addConditionalEdges(
    // @ts-ignore - StateGraph型定義の問題を回避
    "searchWeb",
    (state) => {
      if (state.error) return "error";
      return "writeSections";
    },
    {
      error: "error",
      writeSections: "writeSections",
    }
  );
  
  return graph;
} 