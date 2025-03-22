import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { StateGraph } from "@langchain/langgraph";
import { initChatModel } from "./models";
import { reportPlannerInstructions } from "./prompts";
import type { ResearchState } from "./state";
import { safeJsonParse } from "./textUtils";

/**
 * レポート計画を生成するプロンプトテンプレート
 */
const PLAN_TEMPLATE = reportPlannerInstructions;

/**
 * セクションデータを正規化する
 * 
 * @param sectionsData - 解析されたセクションデータ
 * @returns 正規化されたセクションデータ
 */
function normalizeSections(sectionsData: any): Array<{ name: string; description: string }> {
  // セクションがない場合は空配列を返す
  if (!sectionsData || !Array.isArray(sectionsData)) {
    console.log("[DEBUG] セクションデータが配列ではありません");
    return [];
  }
  
  // 各セクションの形式を正規化
  return sectionsData.map((section: any) => {
    // name または title フィールドを使用
    const name = section.name || section.title || "無題のセクション";
    
    // description フィールドがない場合はデフォルト値を使用
    const description = section.description || `${name}に関する情報`;
    
    return { name, description };
  });
}

/**
 * レポート計画生成チェーンを作成する
 * 
 * @param model - 使用するチャットモデル
 * @returns 計画生成のためのチェーン
 */
export function createPlanChain(model: BaseChatModel) {
  const planPrompt = PromptTemplate.fromTemplate(PLAN_TEMPLATE);
  return RunnableSequence.from([
    planPrompt,
    model,
  ]).pipe(output => String(output.content));
}

/**
 * トピックに基づいてレポート計画を生成する
 * 
 * @param state - 現在の研究状態
 * @returns 更新された研究状態
 */
export async function generateReportPlan(state: ResearchState): Promise<ResearchState> {
  try {
    console.log("[DEBUG] レポート計画の生成を開始...");
    
    const { topic, planModel, planModelProvider } = state;
    
    if (!topic) {
      console.error("[ERROR] トピックが指定されていません");
      return {
        ...state,
        error: "トピックが指定されていません",
        currentStep: "error",
      };
    }
    
    // 計画生成用のモデルを初期化
    const model = initChatModel(planModel, planModelProvider);
    
    // 計画生成チェーンを作成
    const planChain = createPlanChain(model);
    
    // 計画を生成 - 必要なすべてのパラメータを渡す
    const planContent = await planChain.invoke({
      topic,
      reportStructure: "標準的な研究レポート構造を使用してください。序論、本論（複数のセクション）、結論を含めてください。",
      feedback: ""
    });
    
    console.log("[DEBUG] 生成された計画:", planContent);
    
    // JSON解析オプションを設定
    const planData = safeJsonParse<{ 
      sections?: Array<{ name?: string; title?: string; description?: string }>;
      content?: Array<{ name?: string; title?: string; description?: string }>;
    }>(planContent);
    
    // JSONの解析に失敗した場合は空のオブジェクトを使用
    if (planData === null) {
      console.log("[WARNING] 計画データの解析に失敗しました");
      return { ...state, sections: [] };
    }
    
    // セクションフィールドを探す
    let sections = null;
    
    if (planData.sections && Array.isArray(planData.sections)) {
      sections = normalizeSections(planData.sections);
    } else if (planData.content && Array.isArray(planData.content)) {
      sections = normalizeSections(planData.content);
    } else {
      // オブジェクト内を探して配列を見つける
      for (const key in planData) {
        if (Array.isArray((planData as any)[key]) && (planData as any)[key].length > 0) {
          const items = (planData as any)[key];
          if (items[0] && (items[0].name || items[0].title || items[0].description)) {
            sections = normalizeSections(items);
            break;
          }
        }
      }
    }
    
    // セクションが見つからない場合はデフォルトのセクションを作成
    if (!sections || sections.length === 0) {
      console.error("[ERROR] 有効な計画を生成できませんでした");
      
      // デフォルトセクションを作成
      sections = [
        { name: "序論", description: `${topic}の概要と背景` },
        { name: "主要な側面", description: `${topic}の主な特徴と重要なポイント` },
        { name: "分析", description: `${topic}の詳細な分析` },
        { name: "結論", description: `${topic}についての結論と今後の展望` }
      ];
      
      console.log("[DEBUG] デフォルトのセクションを使用します:", sections);
    }
    
    // 計画からセクションを作成
    const formattedSections = sections.map((section) => ({
      name: section.name,
      description: section.description,
      research: true,
      content: "",
    }));
    
    return {
      ...state,
      sections: formattedSections,
      currentStep: "generateQueries",
    };
  } catch (error) {
    console.error("[ERROR] レポート計画生成中にエラーが発生しました:", error);
    return {
      ...state,
      error: `レポート計画生成中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "error",
    };
  }
}

/**
 * 状態グラフに計画生成ステップを追加する
 * 
 * @param graph - 状態グラフ
 * @returns 更新された状態グラフ
 */
export function addPlanGenerationToGraph(graph: StateGraph<ResearchState>) {
  // 計画生成ノードを追加
  graph.addNode("generatePlan", generateReportPlan);
  
  // エッジを追加
  graph.addConditionalEdges(
    "generatePlan",
    (state) => state.currentStep,
    {
      error: "error",
      generateQueries: "generateQueries",
    }
  );
  
  return graph;
} 