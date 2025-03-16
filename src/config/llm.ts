import type { LLMConfig } from "@/lib/llm/types";

export const DEFAULT_MODEL = "gpt-4-turbo-preview";

export const AVAILABLE_MODELS = [
  { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo", description: "最新のGPT-4モデル" },
  { id: "gpt-4", name: "GPT-4", description: "高性能な推論能力を持つモデル" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "バランスの取れた高速なモデル" },
] as const;

export const DEFAULT_CONFIG: LLMConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
};

export const SYSTEM_PROMPTS = {
  default: "あなたは親切で丁寧なアシスタントです。",
  technical: "あなたは技術的な質問に詳しい専門家アシスタントです。",
  business: "あなたはビジネスの課題解決を支援する専門家アシスタントです。",
} as const;

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.openai.com/v1",
  timeout: 30000,
} as const; 