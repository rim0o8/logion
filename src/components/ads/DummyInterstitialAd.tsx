'use client';

import { AD_CONFIG } from '@/config/ads';
import { useEffect, useState } from 'react';

interface DummyInterstitialAdProps {
  onClose: () => void;
  modelId?: string;
  autoCloseTime?: number;
}

export function DummyInterstitialAd({ 
  onClose, 
  modelId,
  autoCloseTime = AD_CONFIG.interstitial.autoCloseTime
}: DummyInterstitialAdProps) {
  const [countdown, setCountdown] = useState(autoCloseTime);
  
  // カウントダウンタイマー
  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, onClose]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">デバッグモード広告</h2>
          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            {countdown}秒
          </span>
        </div>
        
        <div className="bg-muted p-4 rounded-md mb-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">Ad</span>
            </div>
            <h3 className="font-medium">これはテスト用のインタースティシャル広告です</h3>
            <p className="text-sm text-muted-foreground">
              実際の広告はプロダクションモードで表示されます
            </p>
            {modelId && (
              <p className="text-xs bg-background px-2 py-1 rounded">
                使用モデル: {modelId}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            スキップ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
} 