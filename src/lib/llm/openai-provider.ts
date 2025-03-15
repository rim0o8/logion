import OpenAI from 'openai';
import type { LLMConfig, LLMProvider, Message } from './types';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async sendMessage(messages: Message[], config?: LLMConfig): Promise<Message> {
    const response = await this.client.chat.completions.create({
      model: config?.model || 'gpt-4-turbo-preview',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config?.temperature,
      max_tokens: config?.maxTokens,
      top_p: config?.topP,
    });

    return {
      role: 'assistant',
      content: response.choices[0].message.content || '',
    };
  }

  async *streamMessage(messages: Message[], config?: LLMConfig): AsyncGenerator<Message> {
    const stream = await this.client.chat.completions.create({
      model: config?.model || 'gpt-4-turbo-preview',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config?.temperature,
      max_tokens: config?.maxTokens,
      top_p: config?.topP,
      stream: true,
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      yield {
        role: 'assistant',
        content: content,
      };
    }
  }
} 