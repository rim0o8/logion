import { DeepResearchEngine } from '@/lib/deep-research/engine/research-engine';
import { ResearchParamsSchema } from '@/lib/deep-research/types';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// サーバーサイドだけでAPIキーにアクセスするようにする
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

// Server-Sent Eventsのエンコーダー
function encodeSSE(data: unknown, event?: string) {
  const eventField = event ? `event: ${event}\n` : '';
  const jsonData = JSON.stringify(data);
  return `${eventField}data: ${jsonData}\n\n`;
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sse = searchParams.get('sse') === 'true';

  try {
    // 環境変数のデバッグ出力
    console.log('API環境変数のデバッグ:');
    console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY?.substring(0, 5)}...`);
    console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY?.substring(0, 5)}...`);
    console.log(`FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY?.substring(0, 5)}...`);
    
    // 環境変数チェック
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error', message: 'OpenAI APIキーがサーバーに設定されていません' },
        { status: 500 }
      );
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Anthropic APIキーがサーバーに設定されていません' },
        { status: 500 }
      );
    }
    
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Firecrawl APIキーがサーバーに設定されていません' },
        { status: 500 }
      );
    }
    
    // リクエストボディの取得と検証
    const body = await request.json();
    const result = ResearchParamsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    // 環境変数からAPIキーを設定
    const params = result.data;
    params.openaiApiKey = process.env.OPENAI_API_KEY;
    params.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    params.firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    
    console.log('APIキーを環境変数から設定:');
    console.log(`OpenAI APIキー: ${params.openaiApiKey ? '成功' : '失敗'}`);
    console.log(`Anthropic APIキー: ${params.anthropicApiKey ? '成功' : '失敗'}`);
    console.log(`Firecrawl APIキー: ${params.firecrawlApiKey ? '成功' : '失敗'}`);

    // SSEモードの場合、ストリーミングレスポンスを設定
    if (sse) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 進捗状況を追跡するためのコールバック
            const progressCallback = (message: string, progress: number) => {
              controller.enqueue(
                encoder.encode(
                  encodeSSE({ message, progress }, 'progress')
                )
              );
            };
            
            // DeepResearchEngineのインスタンス化と実行
            const researchEngine = new DeepResearchEngine(params, progressCallback);

            // リサーチの実行
            const report = await researchEngine.run();

            // 結果を送信
            controller.enqueue(
              encoder.encode(
                encodeSSE({ report, success: true }, 'result')
              )
            );
            
            // ストリームを終了
            controller.close();
          } catch (error) {
            // エラーメッセージを送信
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            controller.enqueue(
              encoder.encode(
                encodeSSE({ error: 'Research failed', message: errorMessage }, 'error')
              )
            );
            controller.close();
          }
        },
      });

      // SSEヘッダーとストリームを返す
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 従来の非ストリーミングモード
    // 進捗状況を追跡するための配列
    const progressMessages: { message: string; progress: number }[] = [];
    
    // DeepResearchEngineのインスタンス化と実行
    const researchEngine = new DeepResearchEngine(params, (message, progress) => {
      progressMessages.push({ message, progress });
    });

    // リサーチの実行
    const report = await researchEngine.run();

    // 結果を返す
    return NextResponse.json({
      success: true,
      report,
      progressLog: progressMessages
    });
  } catch (error) {
    console.error('Deep Research APIエラー:', error);
    
    // エラーレスポンス
    return NextResponse.json(
      { 
        error: 'Research process failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 