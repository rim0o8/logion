import { AVAILABLE_MODELS } from '@/config/llm';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import mobileAds, { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

// 環境変数から広告設定を取得
const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true';
const adFrequencyFactor = parseFloat(process.env.NEXT_PUBLIC_AD_FREQUENCY_FACTOR || '1.0');

// 本番用広告ユニットID
const BANNER_AD_UNIT_ID = Platform.select({
  ios: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID_IOS,
  android: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID_ANDROID,
});

const INTERSTITIAL_AD_UNIT_ID = Platform.select({
  ios: process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,
  android: process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID,
});

// テスト用広告ユニットID
const TEST_BANNER_AD_UNIT_ID = TestIds.BANNER;
const TEST_INTERSTITIAL_AD_UNIT_ID = TestIds.INTERSTITIAL;

// 開発環境ではテスト広告を使用
const isDev = process.env.NODE_ENV === 'development';
const bannerAdUnitId = isDev ? TEST_BANNER_AD_UNIT_ID : BANNER_AD_UNIT_ID;
const interstitialAdUnitId = isDev ? TEST_INTERSTITIAL_AD_UNIT_ID : INTERSTITIAL_AD_UNIT_ID;

// 広告表示確率を計算する関数
export function calculateAdProbability(modelId: string): number {
  // 広告が無効の場合は0を返す
  if (!isAdsEnabled) return 0;
  
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) return 0.3 * adFrequencyFactor; // デフォルト値
  
  // コスト係数に基づいて確率を計算（0.1〜0.8の範囲）
  return Math.min(0.8, Math.max(0.1, model.costFactor)) * adFrequencyFactor;
}

// 広告を表示すべきかどうかを決定する関数
export function shouldShowAd(modelId: string): boolean {
  // 広告が無効の場合はfalseを返す
  if (!isAdsEnabled) return false;
  
  const probability = calculateAdProbability(modelId);
  return Math.random() < probability;
}

// 広告初期化
export function initializeAds() {
  // 広告が無効の場合は初期化しない
  if (!isAdsEnabled) return Promise.resolve(null);
  
  return mobileAds()
    .initialize()
    .then(adapterStatuses => {
      console.log('Ads initialized:', adapterStatuses);
      return adapterStatuses;
    });
}

// バナー広告フック
export function useBannerAd(modelId: string) {
  const [showAd, setShowAd] = useState(false);
  
  useEffect(() => {
    // 広告が無効の場合は表示しない
    if (!isAdsEnabled) {
      setShowAd(false);
      return;
    }
    
    // モデルに基づいて広告表示を決定
    setShowAd(shouldShowAd(modelId));
  }, [modelId]);
  
  return { showAd, adUnitId: bannerAdUnitId };
}

// インタースティシャル広告
export function useInterstitialAd(modelId: string) {
  const [loaded, setLoaded] = useState(false);
  
  // 広告が無効の場合は早期リターン
  if (!isAdsEnabled) {
    return { 
      loaded: false, 
      showInterstitial: () => false 
    };
  }
  
  const probability = calculateAdProbability(modelId);
  
  const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  
  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });
    
    // 確率に基づいて広告をロード
    if (Math.random() < probability) {
      interstitial.load();
    }
    
    return unsubscribe;
  }, [modelId, probability, interstitial]);
  
  const showInterstitial = () => {
    if (loaded) {
      interstitial.show();
      return true;
    }
    return false;
  };
  
  return { loaded, showInterstitial };
} 