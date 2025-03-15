import { OpenAIProvider } from '@/lib/llm/openai-provider';
import type { Message } from '@/lib/llm/types';
import { Config } from '@/utils/config';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: Message[] = body.messages;
    const stream = body.stream === true;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'メッセージは必須です' },
        { status: 400 }
      );
    }

    const llmProvider = new OpenAIProvider(Config.OPENAI_API_KEY);

    // ストリーミングモードの場合
    if (stream) {
      const encoder = new TextEncoder();
      const streamGenerator = llmProvider.streamMessage(messages);
      
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
    const response = await llmProvider.sendMessage(messages);
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