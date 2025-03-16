import { DEFAULT_CONFIG, getModelProvider } from '@/config/llm';
import { getLangfuse } from '@/lib/langfuse';
import { ClaudeProvider } from '@/lib/llm/claude-provider';
import { DeepSeekProvider } from '@/lib/llm/deepseek-provider';
import { OpenAIProvider } from '@/lib/llm/openai-provider';
import type { LLMConfig, Message } from '@/lib/llm/types';
import { Config } from '@/utils/config';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: Message[] = body.messages;
    const stream = body.stream === true;
    const model = body.model || DEFAULT_CONFIG.model;
    const userId = body.userId;
    const userEmail = body.userEmail;
    const conversationId = body.conversationId;

    console.log(userId, userEmail, conversationId);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'メッセージは必須です' },
        { status: 400 }
      );
    }

    // Langfuseのトレースを開始
    const langfuse = getLangfuse();
    const trace = langfuse.trace({
      name: 'conversation',
      userId: userId,
      sessionId: conversationId,
      metadata: {
        model: model,
        messageCount: messages.length,
        userEmail: userEmail,
        conversationId: conversationId
      },
    });

    // モデルに基づいて適切なプロバイダーを選択
    const provider = getModelProvider(model);
    const llmProvider = 
      provider === 'anthropic' 
        ? new ClaudeProvider(Config.ANTHROPIC_API_KEY)
        : provider === 'deepseek'
          ? new DeepSeekProvider(Config.DEEPSEEK_API_KEY)
          : new OpenAIProvider(Config.OPENAI_API_KEY);
      
    const config: LLMConfig = {
      ...DEFAULT_CONFIG,
      model,
    };

    // ストリーミングモードの場合
    if (stream) {
      const encoder = new TextEncoder();
      const streamGenerator = llmProvider.streamMessage(messages, config);

      // Langfuseでジェネレーションを記録
      const generation = trace.generation({
        name: 'stream-generation',
        model: model,
        modelParameters: {
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
        },
        input: JSON.stringify(messages),
        metadata: {
          conversationId: conversationId,
          userEmail: userEmail
        }
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            let finalContent = '';

            for await (const chunk of streamGenerator) {
              finalContent = chunk.content;
              const encodedChunk = encoder.encode(`${JSON.stringify({ 
                type: 'chunk', 
                content: chunk.content 
              })}\n`);
              controller.enqueue(encodedChunk);
            }
            
            // 完了メッセージを送信
            const finalMessage = {
              role: 'assistant',
              content: finalContent
            };
            
            const encodedFinal = encoder.encode(`${JSON.stringify({ 
              type: 'done', 
              message: finalMessage 
            })}\n`);
            controller.enqueue(encodedFinal);
            controller.close();

            // Langfuseでジェネレーションを完了
            generation.end({
              output: finalContent,
            });

            // バックグラウンドでフラッシュ
            langfuse.flushAsync().catch(err => {
              console.error('Langfuseフラッシュエラー:', err);
            });
          } catch (error) {
            console.error('ストリーミングエラー:', error);
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // 通常モード
    // Langfuseでジェネレーションを記録
    const generation = trace.generation({
      name: 'completion-generation',
      model: model,
      modelParameters: {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
      },
      input: JSON.stringify(messages),
      metadata: {
        conversationId: conversationId,
        userEmail: userEmail
      }
    });

    const response = await llmProvider.sendMessage(messages, config);

    // Langfuseでジェネレーションを完了
    generation.end({
      output: response.content,
    });

    // バックグラウンドでフラッシュ
    langfuse.flushAsync().catch(err => {
      console.error('Langfuseフラッシュエラー:', err);
    });

    return NextResponse.json({
      messages: [...messages, response]
    });

  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}