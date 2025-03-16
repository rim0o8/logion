import OpenAI from 'openai';
import type { LLMConfig, LLMProvider, Message } from './types';

export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com'
    });
  }

  async sendMessage(messages: Message[], config?: LLMConfig): Promise<Message> {
    try {
      const response = await this.client.chat.completions.create({
        model: config?.model || 'deepseek-reasoner',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 2000,
        top_p: config?.topP || 1,
      });

      return {
        role: 'assistant',
        content: response.choices[0].message.content || '',
      };
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return {
        role: 'assistant',
        content: 'エラーが発生しました。しばらく経ってからもう一度お試しください。',
      };
    }
  }

  async *streamMessage(messages: Message[], config?: LLMConfig): AsyncGenerator<Message> {
    try {
      const stream = await this.client.chat.completions.create({
        model: config?.model || 'deepseek-reasoner',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 2000,
        top_p: config?.topP || 1,
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
    } catch (error) {
      console.error('DeepSeek streaming API error:', error);
      yield {
        role: 'assistant',
        content: 'ストリーミング中にエラーが発生しました。',
      };
    }
  }
} 