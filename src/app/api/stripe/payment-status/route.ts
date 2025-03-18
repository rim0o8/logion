import { authOptions } from '@/lib/auth.js';
import { hasUserPaymentMethod } from '@/lib/stripe/customer';
import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // ユーザーのメールアドレスをIDとして使用
    const userId = session.user.email;
    
    // 支払い方法が登録されているか確認
    const hasPaymentMethod = await hasUserPaymentMethod(userId);
    
    return NextResponse.json({
      hasPaymentMethod
    });
  } catch (error) {
    console.error('支払い状態確認エラー:', error);
    return NextResponse.json(
      { error: '支払い状態の確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 