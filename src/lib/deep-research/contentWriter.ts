import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { StateGraph } from "@langchain/langgraph";
import { initChatModel } from "./models";
import { sectionWriterInputs, sectionWriterInstructions } from "./prompts";
import type { Section } from "./state";
import { safeJsonParse } from "./textUtils";

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
 * JsonOutputParserを使用して型指定された出力を得る
 * 
 * @param model - 使用するチャットモデル
 * @returns 型安全なセクション執筆のためのチェーン
 */
export function createTypedWriterChain(model: BaseChatModel) {
  // JSONパーサーを作成
  const parser = new JsonOutputParser<SectionContent>();

  // プロンプトテンプレートを作成し、フォーマット指示を含める
  const writerPrompt = PromptTemplate.fromTemplate(
    `${SECTION_WRITING_TEMPLATE}\n\n{format_instructions}`
  );

  // チェーンを作成
  return RunnableSequence.from([
    {
      // 入力変数をマップ
      prompt: (input: any) => input,
      format_instructions: () => parser.getFormatInstructions(),
    },
    writerPrompt,
    model,
    parser, // JSONパーサーを通して出力を処理
  ]).pipe(output => {
    // パース済みの結果からコンテンツを取得
    console.log(`[DEBUG] 型安全なチェーンから構造化された出力を取得: ${output.content.length}文字`);
    return output.content;
  });
}

/**
 * セクション状態のステップを処理する
 * 
 * @param state - 現在のセクション状態
 * @param sectionKeyName - セクションのキー名
 * @returns 更新されたセクション状態
 */
export async function processSection(state: any, sectionKeyName: string = 'section') {
  try {
    console.log(`[DEBUG] processSection: セクション '${state[sectionKeyName].name}' の処理を開始`);
    
    // セクションがすでに完了しているか確認
    const isAlreadyCompleted = state.completed_sections && 
                               state.completed_sections.some((s: Section) => 
                                 s.name.toLowerCase() === state[sectionKeyName].name.toLowerCase() && s.content);
    
    if (isAlreadyCompleted) {
      console.log(`[DEBUG] セクション '${state[sectionKeyName].name}' はすでに完了しています。スキップします。`);
      return state;
    }
    
    // モデルを初期化
    const model = initChatModel();
    
    // セクション執筆用のチェーンを作成（型安全なバージョンを使用）
    const chain = createTypedWriterChain(model);
    
    // チェーンを実行してコンテンツを生成
    console.log(`[DEBUG] セクション '${state[sectionKeyName].name}' のコンテンツを生成中...`);
    const content = await chain.invoke({
      topic: state.topic,
      section_name: state[sectionKeyName].name,
      section_description: state[sectionKeyName].description,
      source_str: state.source_str || "",
      report_sections_from_research: state.report_sections_from_research || "",
    });
    
    // 新しいセクション状態を作成
    const updatedSection = {
      ...state[sectionKeyName],
      content: content,
    };
    
    // 完了したセクションの配列を更新
    let updatedCompletedSections = [...(state.completed_sections || [])];
    
    // 既存の完了セクションを探す
    const existingIndex = updatedCompletedSections.findIndex(
      (s: Section) => s.name.toLowerCase() === updatedSection.name.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // 既存のセクションを更新
      updatedCompletedSections[existingIndex] = updatedSection;
    } else {
      // 新しいセクションを追加
      updatedCompletedSections.push(updatedSection);
    }
    
    // 更新された状態を返す
    return {
      ...state,
      [sectionKeyName]: updatedSection,
      completed_sections: updatedCompletedSections,
    };
  } catch (error) {
    console.error("[ERROR] セクション処理中にエラーが発生しました:", error);
    throw error;
  }
}

/**
 * LangGraphでの状態グラフにコンテンツライターノードを追加する
 * 
 * @param graph - 状態グラフ
 * @param inputStateKeyName - 入力状態のキー名
 * @param sectionKeyName - セクションのキー名
 * @returns 更新された状態グラフ
 */
export function addContentWriterToGraph(
  graph: StateGraph<any>,
  inputStateKeyName: string = 'section_state',
  sectionKeyName: string = 'section'
) {
  graph.addNode(inputStateKeyName, async (state) => await processSection(state, sectionKeyName));
  return graph;
} 