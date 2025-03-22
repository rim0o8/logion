import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { StateGraph } from "@langchain/langgraph";
import { initChatModel } from "./models";
import { sectionWriterInputs, sectionWriterInstructions } from "./prompts";
import type { ResearchState, SearchResult, Section } from "./state";
import { formatCompletedSections, safeJsonParse } from "./textUtils";

/**
 * セクション執筆のプロンプトテンプレート
 */
const SECTION_WRITING_TEMPLATE = sectionWriterInstructions;

/**
 * 入力形式の生成用テンプレート
 */
const SECTION_INPUTS_TEMPLATE = sectionWriterInputs;

/**
 * JSONコンテンツから実際のセクション内容を抽出する
 * 
 * @param content - 生成された内容（JSON形式またはプレーンテキスト）
 * @returns 抽出されたコンテンツ
 */
function extractContentFromResponse(content: string): string {
  try {
    // JSONオブジェクトからコンテンツフィールドを抽出する
    const contentData = safeJsonParse<{ content?: string }>(content, { content: undefined });
    
    // コンテンツフィールドがある場合はそれを使用
    if (contentData.content) {
      console.log(`[DEBUG] JSONからコンテンツを抽出しました: ${contentData.content.length}文字`);
      return contentData.content;
    }
    
    console.log(`[DEBUG] 有効なJSONのコンテンツフィールドが見つかりませんでした。元のテキストを使用します: ${content.length}文字`);
    return content;
  } catch (error) {
    console.error("[ERROR] コンテンツの抽出中にエラーが発生しました:", error);
    return content;
  }
}

/**
 * セクション執筆チェーンを作成する
 * 
 * @param model - 使用するチャットモデル
 * @returns セクション執筆のためのチェーン
 */
export function createSectionWritingChain(model: BaseChatModel) {
  const sectionWritingPrompt = PromptTemplate.fromTemplate(SECTION_WRITING_TEMPLATE);
  return RunnableSequence.from([
    sectionWritingPrompt,
    model,
  ]).pipe(output => String(output.content));
}

/**
 * セクションのコンテンツを作成する
 * 
 * @param state - 現在の研究状態
 * @returns 更新された研究状態
 */
export async function writeSections(state: ResearchState): Promise<ResearchState> {
  try {
    console.log("[DEBUG] セクション内容の執筆を開始...");
    
    const { topic, sections, searchResults, writeModel, writeModelProvider } = state;
    
    if (!sections || sections.length === 0) {
      console.error("[ERROR] 執筆するセクションがありません");
      return {
        ...state,
        error: "執筆するセクションがありません",
        currentStep: "error",
      };
    }
    
    if (!searchResults || searchResults.length === 0) {
      console.error("[ERROR] 検索結果がありません");
      return {
        ...state,
        error: "検索結果がありません。セクションを執筆できません。",
        currentStep: "error",
      };
    }
    
    // デフォルトか指定されたモデルを使用
    const modelToUse = writeModel || state.planModel;
    const providerToUse = writeModelProvider || state.planModelProvider;
    
    // 執筆用のモデルを初期化
    const model = initChatModel(modelToUse, providerToUse);
    
    // 執筆チェーンを作成
    const sectionWritingChain = createSectionWritingChain(model);
    
    // 検索結果をテキスト形式に変換
    const searchResultsText = searchResults.map((result: SearchResult) => 
      `## [${result.title}](${result.url})\n${result.content}\n`
    ).join('\n\n');
    
    // 完了したセクションを格納する配列
    const completedSections: Section[] = [];
    
    // 各セクションに対して内容を生成
    for (const section of sections) {
      try {
        console.log(`[DEBUG] セクション「${section.name}」の執筆を開始...`);
        
        // 入力テンプレートを作成
        const inputs = SECTION_INPUTS_TEMPLATE
          .replace("{topic}", topic)
          .replace("{sectionName}", section.name)
          .replace("{sectionDescription}", section.description)
          .replace("{sources}", searchResultsText);
        
        // セクション内容を生成
        const sectionContentRaw = await sectionWritingChain.invoke({
          inputs,
          topic,
          sectionName: section.name,
          sectionDescription: section.description
        });
        
        // 生成されたコンテンツからJSONまたはテキストを抽出
        const sectionContent = extractContentFromResponse(sectionContentRaw);
        
        // 完了したセクションを追加
        completedSections.push({
          ...section,
          content: sectionContent,
        });
        
        console.log(`[DEBUG] セクション「${section.name}」の執筆が完了しました`);
      } catch (sectionError) {
        console.error(`[ERROR] セクション「${section.name}」の執筆中にエラーが発生しました:`, sectionError);
        // エラーが発生したセクションには空の内容を設定
        completedSections.push({
          ...section,
          content: "エラー: このセクションの生成中に問題が発生しました。",
        });
      }
    }
    
    // すべてのセクションが完了しているか確認
    const allSectionsCompleted = completedSections.every(
      section => section.content && section.content.length > 0
    );
    
    if (!allSectionsCompleted) {
      console.warn("[WARN] 一部のセクションの執筆が完了していません");
    }
    
    // 完了したセクションをマークダウン形式にフォーマット
    const finalReport = formatCompletedSections(completedSections);
    
    return {
      ...state,
      completedSections,
      finalReport,
      currentStep: "complete",
    };
  } catch (error) {
    console.error("[ERROR] セクション執筆中にエラーが発生しました:", error);
    return {
      ...state,
      error: `セクション執筆中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "error",
    };
  }
}

/**
 * 状態グラフにセクション執筆ステップを追加する
 * 
 * @param graph - 状態グラフ
 * @returns 更新された状態グラフ
 */
export function addSectionWritingToGraph(graph: StateGraph<ResearchState>) {
  // セクション執筆ノードを追加
  graph.addNode("writeSections", writeSections);
  
  // エッジを追加
  graph.addConditionalEdges(
    "writeSections",
    (state) => state.currentStep,
    {
      error: "error",
      complete: "complete",
    }
  );
  
  return graph;
} 