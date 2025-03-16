import type { LLMConfig } from "@/lib/llm/types";

export const DEFAULT_MODEL = "gpt-4-turbo-preview";

export const AVAILABLE_MODELS = [
  { 
    id: "gpt-4-turbo-preview", 
    name: "GPT-4 Turbo", 
    description: "最新のGPT-4モデル",
    costFactor: 1.0  // 最も高価なモデル
  },
  { 
    id: "gpt-4", 
    name: "GPT-4", 
    description: "高性能な推論能力を持つモデル",
    costFactor: 0.8
  },
  { 
    id: "gpt-3.5-turbo", 
    name: "GPT-3.5 Turbo", 
    description: "バランスの取れた高速なモデル",
    costFactor: 0.3  // 最も安価なモデル
  },
  { 
    id: "claude-3-opus-20240229", 
    name: "Claude 3 Opus", 
    description: "Anthropicの最高性能モデル",
    costFactor: 1.1
  },
  { 
    id: "claude-3-sonnet-20240229", 
    name: "Claude 3 Sonnet", 
    description: "バランスの取れたClaudeモデル",
    costFactor: 0.7
  },
  { 
    id: "claude-3-haiku-20240307", 
    name: "Claude 3 Haiku", 
    description: "高速で経済的なClaudeモデル",
    costFactor: 0.2
  },
] as const;

export const DEFAULT_CONFIG: LLMConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
};

// モデルプロバイダーの識別
export const MODEL_PROVIDERS = {
  GPT: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  CLAUDE: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
} as const;

export const getModelProvider = (modelId: string): 'openai' | 'anthropic' => {
  if ((MODEL_PROVIDERS.GPT as readonly string[]).includes(modelId)) return 'openai';
  if ((MODEL_PROVIDERS.CLAUDE as readonly string[]).includes(modelId)) return 'anthropic';
  return 'openai'; // デフォルト
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