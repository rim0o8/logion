import { DeepResearchEngine } from '@/lib/deep-research/engine/research-engine';
import { ResearchParamsSchema } from '@/lib/deep-research/types';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Access API keys only on server side
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

// Server-Sent Events encoder
function encodeSSE(data: unknown, event?: string) {
  const eventField = event ? `event: ${event}\n` : '';
  const jsonData = JSON.stringify(data);
  return `${eventField}data: ${jsonData}\n\n`;
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sse = searchParams.get('sse') === 'true';

  try {
    
    
    // Get and validate request body
    const body = await request.json();
    const result = ResearchParamsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    // Set API keys from environment variables
    const params = result.data;
    
    // Check if using OpenAI models
    if (params.model.includes('gpt')) {
      params.openaiApiKey = process.env.OPENAI_API_KEY;
      if (!params.openaiApiKey) {
        return NextResponse.json(
          { error: 'API key error', message: 'OpenAI API key is not set in server environment' },
          { status: 500 }
        );
      }
    }
    
    // Check if using Anthropic models
    if (params.model.includes('claude')) {
      params.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!params.anthropicApiKey) {
        return NextResponse.json(
          { error: 'API key error', message: 'Anthropic API key is not set in server environment' },
          { status: 500 }
        );
      }
    }
    
    // Set search provider API key
    if (params.searchProvider === 'firecrawl' || !params.searchProvider) {
      params.firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!params.firecrawlApiKey) {
        return NextResponse.json(
          { error: 'API key error', message: 'Firecrawl API key is not set in server environment' },
          { status: 500 }
        );
      }
    } else if (params.searchProvider === 'tavily') {
      params.tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!params.tavilyApiKey) {
        return NextResponse.json(
          { error: 'API key error', message: 'Tavily API key is not set in server environment' },
          { status: 500 }
        );
      }
    }

    // For SSE mode, set up streaming response
    if (sse) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Callback to track progress
            const progressCallback = (message: string, progress: number) => {
              controller.enqueue(
                encoder.encode(
                  encodeSSE({ message, progress }, 'progress')
                )
              );
            };

            // Initialize and run DeepResearchEngine
            const researchEngine = new DeepResearchEngine(params, progressCallback);
            const report = await researchEngine.run();

            // Send result
            controller.enqueue(
              encoder.encode(
                encodeSSE({ report, success: true }, 'result')
              )
            );

            // Close stream
            controller.close();
          } catch (error) {
            // Send error message
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

      // Return SSE headers and stream
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Traditional non-streaming mode
    // Array to track progress
    const progressMessages: { message: string; progress: number }[] = [];
    
    // Initialize and run DeepResearchEngine
    const researchEngine = new DeepResearchEngine(params, (message, progress) => {
      progressMessages.push({ message, progress });
    });

    // Run research
    const report = await researchEngine.run();

    // Return result
    return NextResponse.json({
      success: true,
      report,
      progressLog: progressMessages
    });
  } catch (error) {
    console.error('Deep Research API error:', error);
    
    // Error response
    return NextResponse.json(
      { 
        error: 'Research process failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 