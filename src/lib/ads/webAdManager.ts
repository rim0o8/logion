import { AD_CONFIG, getAdFrequencyFactor } from '@/config/ads';
import { AVAILABLE_MODELS } from '@/config/llm';
import { useEffect, useState } from 'react';

// 環境変数から広告設定を取得
const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true';
const adFrequencyFactor = getAdFrequencyFactor();
const isDebugMode = process.env.NODE_ENV === 'development';
const showDummyAds = isDebugMode && isAdsEnabled;

// 広告ユニットID
const BANNER_AD_UNIT_ID = process.env.NEXT_PUBLIC_ADMOB_BANNER_ID_ANDROID || 'ca-pub-3940256099942544';

// セッション内の広告表示回数を追跡
let sessionAdDisplayCount = 0;
let lastInterstitialDisplayTime = 0;

// モデルのコスト係数に基づいて乗数を取得
function getModelMultiplier(costFactor: number): number {
  const { thresholds, probabilityMultiplier } = AD_CONFIG.modelFactors;
  
  if (costFactor >= thresholds.high) {
    return probabilityMultiplier.high;
  } else if (costFactor >= thresholds.medium) {
    return probabilityMultiplier.medium;
  } else {
    return probabilityMultiplier.low;
  }
}

// 広告表示確率を計算する関数
export function calculateAdProbability(modelId: string, adType: 'banner' | 'interstitial' = 'banner'): number {
  // 広告が無効の場合は0を返す
  if (!isAdsEnabled) return 0;
  
  // セッション内の最大広告表示回数をチェック
  if (AD_CONFIG.limits.maxAdsPerSession > 0 && sessionAdDisplayCount >= AD_CONFIG.limits.maxAdsPerSession) {
    return 0;
  }
  
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) {
    // デフォルト値
    return adType === 'banner' 
      ? AD_CONFIG.banner.baseDisplayProbability * adFrequencyFactor
      : AD_CONFIG.interstitial.baseDisplayProbability * adFrequencyFactor;
  }
  
  // モデルのコスト係数に基づいて確率を調整
  const baseProb = adType === 'banner' 
    ? AD_CONFIG.banner.baseDisplayProbability
    : AD_CONFIG.interstitial.baseDisplayProbability;
  
  const modelMultiplier = getModelMultiplier(model.costFactor);
  
  // 最終的な確率を計算（0.0〜1.0の範囲に収める）
  return Math.min(1.0, Math.max(0.0, baseProb * modelMultiplier * adFrequencyFactor));
}

// 広告を表示すべきかどうかを決定する関数
export function shouldShowAd(modelId: string, adType: 'banner' | 'interstitial' = 'banner'): boolean {
  // 広告が無効の場合はfalseを返す
  if (!isAdsEnabled) return false;
  
  // デバッグモードでは常に表示
  if (showDummyAds) return true;
  
  // インタースティシャル広告の場合、前回の表示からの経過時間をチェック
  if (adType === 'interstitial') {
    const now = Date.now();
    const timeSinceLastDisplay = now - lastInterstitialDisplayTime;
    
    if (timeSinceLastDisplay < AD_CONFIG.interstitial.minTimeBetweenDisplays) {
      return false;
    }
  }
  
  const probability = calculateAdProbability(modelId, adType);
  return Math.random() < probability;
}

// 広告表示をカウント
export function trackAdDisplay(adType: 'banner' | 'interstitial' = 'banner'): void {
  sessionAdDisplayCount++;
  
  if (adType === 'interstitial') {
    lastInterstitialDisplayTime = Date.now();
  }
}

// 広告初期化
export function initializeAds(): void {
  // 広告が無効の場合は初期化しない
  if (!isAdsEnabled) return;
  
  // セッションカウンターをリセット
  sessionAdDisplayCount = 0;
  lastInterstitialDisplayTime = 0;
  
  // Web広告の初期化処理（必要に応じて実装）
  console.log(`Web広告を初期化しました (モード: ${isDebugMode ? 'デバッグ' : '本番'})`);
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
    
    // デバッグモードでは常に表示
    if (showDummyAds) {
      setShowAd(true);
      return;
    }
    
    // モデルに基づいて広告表示を決定
    const shouldShow = shouldShowAd(modelId, 'banner');
    setShowAd(shouldShow);
    
    if (shouldShow) {
      trackAdDisplay('banner');
    }
  }, [modelId]);
  
  return { 
    showAd, 
    adUnitId: BANNER_AD_UNIT_ID,
    isDummyAd: showDummyAds,
    rotationInterval: AD_CONFIG.banner.dummyRotationInterval
  };
}

// インタースティシャル広告（Web版では簡易実装）
export function useInterstitialAd(modelId: string) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // 広告が無効の場合は表示しない
    if (!isAdsEnabled) {
      setShouldShow(false);
      return;
    }
    
    // デバッグモードでは常に表示
    if (showDummyAds) {
      setShouldShow(true);
      return;
    }
    
    // モデルに基づいて広告表示を決定
    const shouldDisplayAd = shouldShowAd(modelId, 'interstitial');
    setShouldShow(shouldDisplayAd);
  }, [modelId]);
  
  const showInterstitial = () => {
    if (shouldShow && isAdsEnabled) {
      if (showDummyAds) {
        // デバッグモードではダミー広告を表示
        setIsVisible(true);
        trackAdDisplay('interstitial');
        return true;
      }
      // 本番モードでは実際の広告を表示
      console.log('インタースティシャル広告を表示');
      trackAdDisplay('interstitial');
      return true;
    }
    return false;
  };
  
  const closeInterstitial = () => {
    setIsVisible(false);
  };
  
  return { 
    loaded: shouldShow, 
    showInterstitial,
    isVisible,
    closeInterstitial,
    isDummyAd: showDummyAds,
    modelId,
    autoCloseTime: AD_CONFIG.interstitial.autoCloseTime
  };
} 