import { processMessageWithTools } from "@/lib/langchain/tools-graph";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * ツール付きチャットAPIのPOSTハンドラ
 */
export async function POST(req: NextRequest) {
  try {
    // リクエストからメッセージを取得
    const { message, userId, userEmail, conversationId } = await req.json();

    // メッセージの検証
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "メッセージは必須で、文字列である必要があります" },
        { status: 400 }
      );
    }
    
    // ツール付きLangGraphエージェントを使用してメッセージを処理
    const messages = await processMessageWithTools(message, { 
      userId: userId || 'anonymous',
      userEmail: userEmail || 'anonymous',
      conversationId: conversationId || '',
    });
    
    // 成功レスポンスを返す
    return NextResponse.json({ messages });
  } catch (error) {
    // エラーハンドリング
    console.error("ツール付きチャットAPIエラー:", error);
    const errorMessage = error instanceof Error ? error.message : "メッセージの処理中にエラーが発生しました";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 