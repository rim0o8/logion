import { Config } from "@/utils/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";

/**
 * チャットモデルを初期化する関数
 * 
 * @param model - 使用するモデル名
 * @param modelProvider - モデルプロバイダー（anthropic, deepseek, openai等）
 * @returns 初期化されたチャットモデル
 */
export function initChatModel(model: string, modelProvider: string) {
  console.log(`[DEBUG] モデル初期化: provider=${modelProvider}, model=${model}`);
  switch (modelProvider.toLowerCase()) {
    case 'anthropic':
      return new ChatAnthropic({
        modelName: model,
        apiKey: Config.ANTHROPIC_API_KEY,
      });
    case 'deepseek':
      return new ChatDeepSeek({
        modelName: model,
        apiKey: Config.DEEPSEEK_API_KEY,
      });
    default:
      return new ChatOpenAI({
        modelName: model,
        apiKey: Config.OPENAI_API_KEY,
      });
  }
} 