import { authOptions } from '@/lib/auth.js';
import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// 本番環境ではStripeのシークレットキーを環境変数から取得
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // リクエストボディからトークン数を取得
    const { tokenCount, modelId } = await request.json();
    
    if (!tokenCount || tokenCount <= 0) {
      return NextResponse.json(
        { error: '有効なトークン数を指定してください' },
        { status: 400 }
      );
    }

    // TODO: Stripeライブラリがインストールされたら以下のコードを有効化
    /*
    // ユーザーのStripe顧客IDを取得
    const stripeCustomerId = await getUserStripeCustomerId(session.user.id);
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: '支払い情報が設定されていません' },
        { status: 400 }
      );
    }
    
    // ユーザーのサブスクリプション情報を取得
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
    });
    
    if (!subscriptions.data.length) {
      return NextResponse.json(
        { error: 'アクティブなサブスクリプションがありません' },
        { status: 400 }
      );
    }
    
    // 使用量を記録
    const subscription = subscriptions.data[0];
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscription.items.data[0].id,
      {
        quantity: tokenCount,
        timestamp: 'now',
        action: 'increment',
      }
    );
    
    return NextResponse.json({
      success: true,
      usageRecord: usageRecord
    });
    */
    
    // 仮の実装（Stripeライブラリがインストールされるまで）
    console.log(`使用量記録: ${tokenCount}トークン, モデル: ${modelId}`);
    
    return NextResponse.json({
      success: true,
      message: `${tokenCount}トークンの使用量を記録しました`
    });
    
  } catch (error) {
    console.error('使用量記録エラー:', error);
    return NextResponse.json(
      { error: '使用量の記録中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 