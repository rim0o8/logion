/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { StateGraph } from "@langchain/langgraph";
import { initChatModel } from "./models";
import { sectionWriterInstructions } from "./prompts";
import type { ResearchState, Section } from "./state";
import { safeJsonParse } from "./textUtils";

/**
 * セクション処理の状態インターフェース
 */
interface SectionProcessState {
  topic: string;
  section: Section;
  completedSections?: Section[];
  searchResults?: Record<string, unknown>[];
  writeModel?: string;
  writeModelProvider?: string;
  planModel?: string;
  planModelProvider?: string;
  [key: string]: unknown;
}

/**
 * セクション執筆のプロンプトテンプレート
 */
const SECTION_WRITING_TEMPLATE = sectionWriterInstructions;

/**
 * JSONコンテンツから実際のセクション内容を抽出する
 * 
 * @param content - 生成された内容（JSON形式またはプレーンテキスト）
 * @returns 抽出されたコンテンツ
 */
function extractContentFromResponse(content: string): string {
  try {
    // JSONオブジェクトからコンテンツフィールドを抽出する
    const contentData = safeJsonParse<{ content?: string }>(content);
    
    // JSONの解析に失敗した場合は元のテキストを返す
    if (contentData === null) {
      console.log(`[DEBUG] JSONの解析に失敗しました。元のテキストを使用します: ${content.length}文字`);
      return content;
    }
    
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
 * セクション執筆用のチェーンを作成する
 * このバージョンはstringとして出力を返す
 * 
 * @param model - 使用するチャットモデル
 * @returns セクション執筆のためのチェーン
 */
export function createWriterChain(model: BaseChatModel) {
  const writerPrompt = PromptTemplate.fromTemplate(SECTION_WRITING_TEMPLATE);
  return RunnableSequence.from([
    writerPrompt,
    model,
  ]).pipe(output => {
    const contentStr = String(output.content);
    return extractContentFromResponse(contentStr);
  });
}

/**
 * セクションコンテンツの型定義
 */
interface SectionContent {
  content: string;
}

/**
 * 型安全なセクション執筆用のチェーンを作成する
 * 
 * @param model - 使用するチャットモデル
 * @returns セクション執筆のためのチェーン
 */
export function createTypedWriterChain(model: BaseChatModel) {
  // パーサーを作成
  const parser = new StringOutputParser();

  // プロンプトテンプレートを作成
  const writerPrompt = PromptTemplate.fromTemplate(SECTION_WRITING_TEMPLATE);

  // チェーンを作成
  return RunnableSequence.from([
    // 入力を整形
    (input: Record<string, unknown>) => {
      return {
        topic: input.topic,
        sectionName: input.sectionName,
        sectionDescription: input.sectionDescription,
        searchResults: input.searchResults || []
      };
    },
    // 整形した入力をプロンプトに渡す
    (formattedInput) => writerPrompt.invoke(formattedInput),
    // プロンプトの出力をモデルに渡す
    (promptOutput) => model.invoke(promptOutput),
    // 最終的な文字列出力としてパース
    (modelOutput) => parser.invoke(modelOutput)
  ]);
}

/**
 * セクションの処理を行う
 * 
 * @param state - セクション処理の状態
 * @param sectionKeyName - セクションのキー名（デフォルトは'section'）
 * @returns 更新された状態
 */
export async function processSection(state: SectionProcessState, sectionKeyName = 'section') {
  try {
    const currentSection = state[sectionKeyName] as Section;
    
    if (!currentSection) {
      console.error('[ERROR] セクションが見つかりません');
      return {
        ...state,
        error: 'セクションが見つかりません'
      };
    }
    
    console.log(`[DEBUG] セクション '${currentSection.name}' の処理を開始します...`);
    
    // すでに完了したセクションかどうかをチェック
    const isAlreadyCompleted = state.completedSections?.some(
      s => s.name.toLowerCase() === currentSection.name.toLowerCase() && s.content);
    
    if (isAlreadyCompleted) {
      console.log(`[DEBUG] セクション '${currentSection.name}' はすでに完了しています。スキップします。`);
      return state;
    }
    
    // モデルを初期化（デフォルトモデルを使用）
    const model = initChatModel(state.writeModel as string, state.writeModelProvider as string);
    
    // セクション執筆用のチェーンを作成（型安全なバージョンを使用）
    const chain = createTypedWriterChain(model);
    
    // チェーンを実行してコンテンツを生成
    console.log(`[DEBUG] セクション '${currentSection.name}' のコンテンツを生成中...`);
    const content = await chain.invoke({
      topic: state.topic,
      sectionName: currentSection.name,
      sectionDescription: currentSection.description,
      searchResults: state.searchResults || [],
    });
    
    console.log('[DEBUG] セクションのコンテンツが生成されました');
    
    // 完了したセクションを準備
    const completedSection = {
      ...currentSection,
      content: extractContentFromResponse(content),
    };
    
    // 完了したセクションの配列を追加または更新
    const completedSections = [...(state.completedSections || [])];
    
    // すでにリストにあるかどうかをチェック
    const existingIndex = completedSections.findIndex(
      s => s.name.toLowerCase() === completedSection.name.toLowerCase());
    
    if (existingIndex >= 0) {
      // 既存のセクションを更新
      completedSections[existingIndex] = completedSection;
    } else {
      // 新しいセクションを追加
      completedSections.push(completedSection);
    }
    
    // 更新された状態を返す
    const updatedState = {
      ...state,
      completed_sections: completedSections,
    };
    
    return updatedState;
  } catch (error) {
    console.error('[ERROR] セクション処理中にエラーが発生しました:', error);
    return {
      ...state,
      error: `セクション処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 状態グラフにコンテンツ執筆ステップを追加する
 * 
 * @param graph - 状態グラフ
 * @param inputStateKeyName - 入力状態のキー名
 * @param sectionKeyName - セクションのキー名
 * @returns 更新された状態グラフ
 */
export function addContentWriterToGraph(
  graph: StateGraph<ResearchState | SectionProcessState>,
  inputStateKeyName = 'section_state',
  sectionKeyName = 'section'
) {
  graph.addNode(inputStateKeyName, async (state: SectionProcessState) => await processSection(state, sectionKeyName));
  return graph;
} 