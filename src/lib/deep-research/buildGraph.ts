/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Command, END, StateGraph } from "@langchain/langgraph";
import { addContentWriterToGraph } from "./contentWriter";
import { addPlanGenerationToGraph } from "./planGenerator";
import { addQueryGenerationToGraph } from "./queryGenerator";
import { addWebSearchToGraph } from "./searchEngine";
import type { ResearchState, Section } from "./state";

/**
 * 注意: このファイルにはLangChainのバージョン互換性の問題があります。
 * 現在のLangChainバージョン(0.2.57)では、StateGraphの型システムが
 * 大幅に変更されており、完全な型安全性を確保するのが難しい状況です。
 * このため、一部の型チェックを無効化しています。
 * 
 * 根本的な解決策としては以下のいずれかがあります：
 * 1. LangChainのバージョンをダウングレードする
 * 2. このコードを完全に最新の型システムに合わせて書き直す
 */

// カスタムのチャネル定義型
type ResearchChannels = {
  topic: string;
  planModel: string;
  planModelProvider: string;
  queryModel: string | undefined;
  queryModelProvider: string | undefined;
  writeModel: string | undefined;
  writeModelProvider: string | undefined;
  sections: Section[] | undefined;
  searchQueries: unknown[] | undefined;
  error: string | undefined;
  currentStep: string;
  finalReport: string | undefined;
};

/**
 * エラーハンドリングノードを作成
 * 
 * @param state - 現在の研究状態
 * @returns 更新された研究状態
 */
async function handleError(state: ResearchState) {
  console.error("[ERROR] エラーが発生しました:", state.error);
  
  // エラーメッセージを含む最終レポートを生成
  const errorReport = `# エラーレポート\n\n処理中にエラーが発生しました: ${state.error}`;
  
  return new Command({
    update: {
      finalReport: errorReport,
      currentStep: "complete",
    }
  });
}

/**
 * 完了ノードを作成
 * 
 * @returns 終了コマンド
 */
async function complete() {
  console.log("[DEBUG] 処理が完了しました。");
  return new Command({
    update: {
      currentStep: "end",
    }
  });
}

/**
 * 研究状態グラフを構築する
 * 
 * @returns 構築された状態グラフ
 */
export function buildResearchGraph() {
  // 最新のLangChainではStateGraphの型定義が変更されているため、
  // @ts-ignoreを使用して型チェックを無視しています
  
  // @ts-ignore - channels定義の型エラーを回避
  const builder = new StateGraph({
    channels: {
      // @ts-ignore - channelsプロパティの型エラーを回避
      topic: { value: (oldValue: string, newValue: string) => newValue },
      planModel: { value: (oldValue: string, newValue: string) => newValue },
      planModelProvider: { value: (oldValue: string, newValue: string) => newValue },
      queryModel: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue },
      queryModelProvider: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue },
      writeModel: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue },
      writeModelProvider: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue },
      sections: { value: (oldValue: Section[] | undefined, newValue: Section[] | undefined) => newValue },
      searchQueries: { value: (oldValue: unknown[] | undefined, newValue: unknown[] | undefined) => newValue },
      error: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue },
      currentStep: { value: (oldValue: string, newValue: string) => newValue },
      finalReport: { value: (oldValue: string | undefined, newValue: string | undefined) => newValue }
    }
  });
  
  // 各ステップをグラフに追加
  // @ts-ignore - 型エラーを回避
  addPlanGenerationToGraph(builder);
  // @ts-ignore - 型エラーを回避
  addQueryGenerationToGraph(builder);
  // @ts-ignore - 型エラーを回避
  addWebSearchToGraph(builder);
  // @ts-ignore - 型エラーを回避
  addContentWriterToGraph(builder);
  
  // エラー処理ノードを追加
  // @ts-ignore - 型エラーを回避
  builder.addNode("error", handleError);
  
  // 完了ノードを追加
  // @ts-ignore - 型エラーを回避
  builder.addNode("complete", complete);
  
  // エッジを追加（先にノードを追加してからエッジを設定する必要があるため、この順番は重要）
  // @ts-ignore - 引数の型エラーを回避
  builder.addEdge("__start__", "generatePlan");
  
  // 条件付きエッジの設定
  // @ts-ignore - エッジ関連の型エラーを回避
  builder.addConditionalEdges(
    "__start__",
    // @ts-ignore - 型エラーを回避
    (state: ResearchChannels) => state.currentStep,
    {
      "generatePlan": "generatePlan",
      "generateQueries": "generateQueries",
      "searchWeb": "searchWeb",
      "writeSections": "writeSections",
      "error": "error",
      "complete": "complete"
    }
  );
  
  // @ts-ignore - 引数の型エラーを回避
  builder.addEdge("complete", END);
  
  // グラフをコンパイル
  return builder.compile();
}

/**
 * 研究を実行する
 * 
 * @param initialState - 初期状態
 * @returns 研究結果
 */
export async function runResearch(initialState: ResearchState): Promise<ResearchState> {
  try {
    console.log("[DEBUG] 研究を開始します...");
    console.log("[DEBUG] 初期状態:", initialState);
    
    // グラフを構築
    const graph = buildResearchGraph();
    
    // グラフを実行
    // @ts-ignore - 型エラーを回避
    const result = await graph.invoke({
      ...initialState,
      currentStep: "start",
    });
    
    console.log("[DEBUG] 研究が完了しました");
    
    return result as ResearchState;
  } catch (error) {
    console.error("[ERROR] 研究実行中にエラーが発生しました:", error);
    return {
      ...initialState,
      error: `研究実行中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      finalReport: "# エラーレポート\n\n研究実行中に技術的な問題が発生しました。",
    };
  }
} 