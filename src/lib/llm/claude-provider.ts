import { Anthropic } from '@anthropic-ai/sdk';
import type { LLMConfig, LLMProvider, Message } from './types';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(messages: Message[], config?: LLMConfig): Promise<Message> {
    try {
      // システムメッセージを分離
      const systemMessage = messages.find(msg => msg.role === 'system');
      const userAssistantMessages = messages.filter(msg => msg.role !== 'system');

      // @ts-ignore - SDKのバージョンによって型が異なるため
      const response = await this.client.messages.create({
        model: config?.model || 'claude-3-opus-20240229',
        messages: userAssistantMessages.map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: msg.content,
        })),
        system: systemMessage?.content,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 1024,
        top_p: config?.topP || 1,
      });

      // レスポンスの構造を安全に処理
      let responseText = '';
      if (response.content && response.content.length > 0) {
        const firstContent = response.content[0];
        if (typeof firstContent === 'object' && firstContent !== null) {
          // @ts-ignore - SDKのバージョンによって型が異なるため
          if ('text' in firstContent) {
            // @ts-ignore
            responseText = firstContent.text;
          // @ts-ignore
          } else if ('type' in firstContent && firstContent.type === 'text' && 'text' in firstContent) {
            // @ts-ignore
            responseText = firstContent.text;
          }
        }
      }

      return {
        role: 'assistant',
        content: responseText,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return {
        role: 'assistant',
        content: 'エラーが発生しました。しばらく経ってからもう一度お試しください。',
      };
    }
  }

  async *streamMessage(messages: Message[], config?: LLMConfig): AsyncGenerator<Message> {
    try {
      // システムメッセージを分離
      const systemMessage = messages.find(msg => msg.role === 'system');
      const userAssistantMessages = messages.filter(msg => msg.role !== 'system');

      // @ts-ignore - SDKのバージョンによって型が異なるため
      const stream = await this.client.messages.create({
        model: config?.model || 'claude-3-opus-20240229',
        messages: userAssistantMessages.map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: msg.content,
        })),
        system: systemMessage?.content,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 1024,
        top_p: config?.topP || 1,
        stream: true,
      });

      let content = '';
      // @ts-ignore - SDKのバージョンによって型が異なるため
      for await (const chunk of stream) {
        try {
          if (chunk.type === 'content_block_delta') {
            // 異なるバージョンのSDKに対応
            let deltaText = '';
            if (chunk.delta && typeof chunk.delta === 'object') {
              // @ts-ignore
              if ('text' in chunk.delta) {
                // @ts-ignore
                deltaText = chunk.delta.text;
              // @ts-ignore
              } else if ('type' in chunk.delta && chunk.delta.type === 'text' && 'text' in chunk.delta) {
                // @ts-ignore
                deltaText = chunk.delta.text;
              }
            }
            
            if (deltaText) {
              content += deltaText;
              yield {
                role: 'assistant',
                content: content,
              };
            }
          }
        } catch (error) {
          console.error('Stream chunk processing error:', error);
        }
      }
    } catch (error) {
      console.error('Claude streaming API error:', error);
      yield {
        role: 'assistant',
        content: 'ストリーミング中にエラーが発生しました。',
      };
    }
  }
} 