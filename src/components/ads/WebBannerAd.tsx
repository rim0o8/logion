import { useEffect, useRef } from 'react';

// adsbygoogleのための型定義
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

interface WebBannerAdProps {
  adUnitId: string;
  className?: string;
}

export function WebBannerAd({ adUnitId, className = '' }: WebBannerAdProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Google AdSenseスクリプトを動的に読み込む
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.setAttribute('data-ad-client', adUnitId);
    document.head.appendChild(script);

    // 広告を初期化
    if (adContainerRef.current && window.adsbygoogle) {
      try {
        // 広告を初期化
        const adsbyGoogle = window.adsbygoogle || [];
        adsbyGoogle.push({});
        window.adsbygoogle = adsbyGoogle;
      } catch (error) {
        console.error('広告の初期化に失敗しました:', error);
      }
    }

    return () => {
      // クリーンアップ
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [adUnitId]);

  return (
    <div ref={adContainerRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adUnitId}
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
} 