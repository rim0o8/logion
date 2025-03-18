'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Stripeの公開可能キーを環境変数から取得
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// カード入力フォームコンポーネント
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // カード情報を確認
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }
      
      // SetupIntentを確認
      const { setupIntent, error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success`,
        },
        redirect: 'if_required',
      });
      
      if (confirmError) {
        throw new Error(confirmError.message);
      }
      
      if (setupIntent && setupIntent.status === 'succeeded') {
        // 支払い方法の状態を更新
        const response = await fetch('/api/stripe/update-payment-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '支払い方法の更新に失敗しました');
        }
        
        // 成功したらホームページにリダイレクト
        router.push('/');
      }
    } catch (err) {
      console.error('支払い情報登録エラー:', err);
      setError(err instanceof Error ? err.message : '支払い情報の登録中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={!stripe || !elements || isLoading}
        >
          {isLoading ? '処理中...' : '支払い情報を登録する'}
        </Button>
      </div>
    </form>
  );
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stripe Elementsのオプション
  const options = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  } : undefined;

  // SetupIntentのクライアントシークレットを取得
  useEffect(() => {
    const getSetupIntent = async () => {
      if (status === 'loading' || status === 'unauthenticated') {
        return;
      }

      try {
        setIsLoading(true);
        
        // 支払い状態を確認
        const statusResponse = await fetch('/api/stripe/payment-status');
        const statusData = await statusResponse.json();
        
        // 既に支払い方法が登録されている場合はホームページにリダイレクト
        if (statusData.hasPaymentMethod) {
          router.push('/');
          return;
        }
        
        // SetupIntentを作成
        const response = await fetch('/api/stripe/setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'SetupIntentの作成に失敗しました');
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('SetupIntent取得エラー:', err);
        setError(err instanceof Error ? err.message : 'SetupIntentの取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    getSetupIntent();
  }, [status, router]);

  // セッションがロード中の場合
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>支払い情報の登録</CardTitle>
          <CardDescription>
            生成AIの使用量に応じて課金されます。初回登録時にクレジットカード情報が必要です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/50">
              <h3 className="font-medium mb-2">料金プラン</h3>
              <p className="text-sm text-muted-foreground mb-2">
                従量課金制: 生成AIの使用量に応じて課金されます
              </p>
              <ul className="text-sm space-y-1">
                <li>• 1,000トークンあたり 5円</li>
                <li>• 月末に使用量に応じて請求</li>
                <li>• いつでもキャンセル可能</li>
              </ul>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="h-40 border rounded-md flex items-center justify-center">
                <p className="text-muted-foreground text-sm">読み込み中...</p>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm />
              </Elements>
            ) : (
              <div className="h-40 border rounded-md flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  支払い情報の読み込みに失敗しました。ページを再読み込みしてください。
                </p>
              </div>
            )}
          </div>
        </CardContent>
        {!clientSecret && !isLoading && (
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              再読み込み
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 