import { AVAILABLE_MODELS } from '@/config/llm';
import { useEffect, useState } from 'react';

// 環境変数から広告設定を取得
const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true';
const adFrequencyFactor = Number.parseFloat(process.env.NEXT_PUBLIC_AD_FREQUENCY_FACTOR || '1.0');

// Web向けの広告ユニットID
const BANNER_AD_UNIT_ID = process.env.NEXT_PUBLIC_ADMOB_BANNER_ID;
const INTERSTITIAL_AD_UNIT_ID = process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID;

// 広告表示確率を計算する関数
export function calculateAdProbability(modelId: string): number {
  if (!isAdsEnabled) return 0;
  
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) return 0.3 * adFrequencyFactor;
  
  return Math.min(0.8, Math.max(0.1, model.costFactor)) * adFrequencyFactor;
}

// 広告を表示すべきかどうかを決定する関数
export function shouldShowAd(modelId: string): boolean {
  if (!isAdsEnabled) return false;
  
  const probability = calculateAdProbability(modelId);
  return Math.random() < probability;
}

// Web向けの広告初期化（Google AdSenseなどを使用する場合）
export function initializeAds() {
  if (!isAdsEnabled) return Promise.resolve(null);
  
  // Web向けの広告初期化ロジックを実装
  return Promise.resolve(null);
}

// バナー広告フック
export function useBannerAd(modelId: string) {
  const [showAd, setShowAd] = useState(false);
  
  useEffect(() => {
    if (!isAdsEnabled) {
      setShowAd(false);
      return;
    }
    
    setShowAd(shouldShowAd(modelId));
  }, [modelId]);
  
  return { showAd, adUnitId: BANNER_AD_UNIT_ID };
}

// インタースティシャル広告フック
export function useInterstitialAd(modelId: string) {
  const [loaded, setLoaded] = useState(false);
  
  if (!isAdsEnabled) {
    return { 
      loaded: false, 
      showInterstitial: () => false 
    };
  }
  
  // Web向けのインタースティシャル広告実装
  const showInterstitial = () => {
    if (loaded) {
      // Web向けの広告表示ロジックを実装
      return true;
    }
    return false;
  };
  
  return { loaded, showInterstitial };
} 