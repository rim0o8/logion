import { z } from 'zod';

/**
 * レポートセクションを表すインターフェース
 */
export interface Section {
  /** セクションの名前 */
  name: string;
  /** セクションの概要説明 */
  description: string;
  /** このセクションのためのプラン */
  plan?: string;
  /** このセクションのためにWeb検索を実行するかどうか */
  research: boolean;
  /** セクションの内容 */
  content: string;
}

/**
 * セクションのZodスキーマ
 */
export const SectionSchema = z.object({
  name: z.string().describe('Name for this section of the report.'),
  description: z.string().describe('Brief overview of the main topics and concepts to be covered in this section.'),
  plan: z.string().optional().describe('Plan for this section of the report.'),
  research: z.boolean().describe('Whether to perform web research for this section of the report.'),
  content: z.string().describe('The content of the section.')
});

/**
 * セクション配列のZodスキーマ
 */
export const SectionsSchema = z.object({
  sections: z.array(SectionSchema).describe('Sections of the report.')
});

/**
 * 検索クエリを表すインターフェース
 */
export interface SearchQuery {
  /** Web検索用のクエリ */
  search_query: string;
}

/**
 * 検索クエリのZodスキーマ
 */
export const SearchQuerySchema = z.object({
  search_query: z.string().nullable().describe('Query for web search.')
});

/**
 * 検索クエリ配列のZodスキーマ
 */
export const QueriesSchema = z.object({
  queries: z.array(SearchQuerySchema).describe('List of search queries.')
});

/**
 * フィードバック評価のタイプ
 */
export type GradeType = 'pass' | 'fail';

/**
 * フィードバックを表すインターフェース
 */
export interface Feedback {
  /** 要件を満たすか（'pass'）または修正が必要か（'fail'）を示す評価結果 */
  grade: GradeType;
  /** フォローアップ検索クエリの一覧 */
  follow_up_queries: SearchQuery[];
}

/**
 * フィードバックのZodスキーマ
 */
export const FeedbackSchema = z.object({
  grade: z.enum(['pass', 'fail']).describe("Evaluation result indicating whether the response meets requirements ('pass') or needs revision ('fail')."),
  follow_up_queries: z.array(SearchQuerySchema).describe('List of follow-up search queries.')
});

/**
 * レポート状態の入力インターフェース
 */
export interface ReportStateInput {
  /** レポートのトピック */
  topic: string;
}

/**
 * レポート状態の出力インターフェース
 */
export interface ReportStateOutput {
  /** 最終レポート */
  final_report: string;
}

/**
 * レポート状態を表すインターフェース
 */
export interface ReportState {
  /** レポートのトピック */
  topic: string;
  /** レポート計画に対するフィードバック */
  feedback_on_report_plan: string;
  /** レポートセクションのリスト */
  sections: Section[];
  /** 完了したセクション（この配列は加算的に更新される） */
  completed_sections: Section[];
  /** 研究から作成された完了セクションの文字列 */
  report_sections_from_research: string;
  /** 最終レポート */
  final_report: string;
}

/**
 * セクション状態を表すインターフェース
 */
export interface SectionState {
  /** レポートのトピック */
  topic: string;
  /** レポートセクション */
  section: Section;
  /** 実行済みの検索イテレーション数 */
  search_iterations: number;
  /** 検索クエリのリスト */
  search_queries: SearchQuery[];
  /** Web検索からのフォーマット済みソースコンテンツ */
  source_str: string;
  /** 研究から作成された完了セクションの文字列 */
  report_sections_from_research: string;
  /** 完了したセクション（外部状態と同期するために複製される） */
  completed_sections: Section[];
  grade_result?: string;
}

/**
 * セクション出力状態を表すインターフェース
 */
export interface SectionOutputState {
  /** 完了したセクション（外部状態と同期するために複製される） */
  completed_sections: Section[];
}

/**
 * 深層研究の状態を表すインターフェース
 */
export interface ResearchState {
  /** レポートのトピック */
  topic: string;
  /** 計画生成に使用するモデル */
  planModel: string;
  /** 計画生成に使用するモデルプロバイダー */
  planModelProvider: string;
  /** クエリ生成に使用するモデル */
  queryModel?: string;
  /** クエリ生成に使用するモデルプロバイダー */
  queryModelProvider?: string;
  /** セクション執筆に使用するモデル */
  writeModel?: string;
  /** セクション執筆に使用するモデルプロバイダー */
  writeModelProvider?: string;
  /** レポートセクションのリスト */
  sections: Section[];
  /** 現在のプロセスステップ */
  currentStep: string;
  /** エラーメッセージ（存在する場合） */
  error?: string;
  /** 検索クエリのリスト */
  queries?: SearchQuery[];
  /** 完了したセクション */
  completedSections?: Section[];
  /** 最終的なレポート内容 */
  finalReport?: string;
} 