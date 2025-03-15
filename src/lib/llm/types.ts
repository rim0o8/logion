export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LLMProvider {
  sendMessage(messages: Message[], config?: LLMConfig): Promise<Message>;
  streamMessage(messages: Message[], config?: LLMConfig): AsyncGenerator<Message>;
}

export interface LLMResponse {
  message: Message;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} 