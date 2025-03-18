import { authOptions } from '@/lib/auth.js';
import { updateUserPaymentMethodStatus } from '@/lib/stripe/customer';
import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripeインスタンスを初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // リクエストボディからpaymentMethodIdを取得
    const { paymentMethodId } = await request.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: '支払い方法IDが指定されていません' },
        { status: 400 }
      );
    }

    // ユーザーのメールアドレスをIDとして使用
    const userId = session.user.email;
    
    // 支払い方法の状態を更新
    await updateUserPaymentMethodStatus(userId, true);
    
    // 従量課金サブスクリプションを作成
    // 注: 実際の実装では、ここでStripeのサブスクリプションを作成します
    // const subscription = await stripe.subscriptions.create({
    //   customer: stripeCustomerId,
    //   items: [{ price: process.env.STRIPE_PRICE_ID }],
    //   payment_behavior: 'default_incomplete',
    //   payment_settings: { save_default_payment_method: 'on_subscription' },
    //   expand: ['latest_invoice.payment_intent'],
    // });
    
    return NextResponse.json({
      success: true,
      message: '支払い方法が正常に登録されました'
    });
  } catch (error) {
    console.error('支払い方法更新エラー:', error);
    return NextResponse.json(
      { error: '支払い方法の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 