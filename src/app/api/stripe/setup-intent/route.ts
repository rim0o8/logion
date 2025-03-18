import { authOptions } from '@/lib/auth.js';
import { getUserStripeCustomerId, saveUserStripeCustomerId } from '@/lib/stripe/customer';
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

    // ユーザーのメールアドレスを取得
    const userEmail = session.user.email;
    const userId = userEmail; // メールアドレスをユーザーIDとして使用

    // Stripeの顧客を作成または取得
    let customer: Stripe.Customer | Stripe.DeletedCustomer;
    
    // FirestoreからユーザーのstripeCustomerIdを取得
    const stripeCustomerId = await getUserStripeCustomerId(userId);
    
    if (stripeCustomerId) {
      // 既存の顧客情報を取得
      customer = await stripe.customers.retrieve(stripeCustomerId);
      
      // 削除済みの顧客の場合は新規作成
      if ((customer as Stripe.DeletedCustomer).deleted) {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId
          }
        });
        
        // 新しい顧客IDを保存
        await saveUserStripeCustomerId(userId, customer.id);
      }
    } else {
      // 新規顧客を作成
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      
      // ユーザーレコードにStripeの顧客IDを保存
      await saveUserStripeCustomerId(userId, customer.id);
    }
    
    // SetupIntentを作成
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session', // 将来の支払いに使用することを示す
    });
    
    return NextResponse.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe SetupIntent作成エラー:', error);
    return NextResponse.json(
      { error: '支払い情報の設定中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 