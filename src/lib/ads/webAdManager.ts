import { AD_CONFIG, getAdFrequencyFactor } from '@/config/ads';
import { AVAILABLE_MODELS } from '@/config/llm';
import { Config } from '@/utils/config';
import { useEffect, useState } from 'react';
// 環境変数から広告設定を取得
const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true';
const adFrequencyFactor = getAdFrequencyFactor();
const isDebugMode = Config.NODE_ENV === 'development';
const showDummyAds = Config.NEXT_PUBLIC_DUMMY_ADS && isAdsEnabled;

// 広告ユニットID
const BANNER_AD_UNIT_ID = Config.NEXT_PUBLIC_ADMOB_BANNER_ID;

// セッション内の広告表示回数を追跡
let sessionAdDisplayCount = 0;
let lastInterstitialDisplayTime = 0;

// ログ出力関数
function logAdInfo(message: string, data?: unknown) {
  console.log(`[広告マネージャー] ${message}`, data ? data : '');
}

// モデルのコスト係数に基づいて乗数を取得
function getModelMultiplier(costFactor: number): number {
  const { thresholds, probabilityMultiplier } = AD_CONFIG.modelFactors;
  
  if (costFactor >= thresholds.high) {
    logAdInfo(`高コストモデル係数を適用: ${probabilityMultiplier.high}`);
    return probabilityMultiplier.high;
  }
  if (costFactor >= thresholds.medium) {
    logAdInfo(`中コストモデル係数を適用: ${probabilityMultiplier.medium}`);
    return probabilityMultiplier.medium;
  }
  logAdInfo(`低コストモデル係数を適用: ${probabilityMultiplier.low}`);
  return probabilityMultiplier.low;
}

// 広告表示確率を計算する関数
export function calculateAdProbability(modelId: string, adType: 'banner' | 'interstitial' = 'banner'): number {
  // 広告が無効の場合は0を返す
  if (!isAdsEnabled) {
    logAdInfo('広告が無効化されています');
    return 0;
  }
  
  // セッション内の最大広告表示回数をチェック
  if (AD_CONFIG.limits.maxAdsPerSession > 0 && sessionAdDisplayCount >= AD_CONFIG.limits.maxAdsPerSession) {
    logAdInfo(`セッション内の最大広告表示回数(${AD_CONFIG.limits.maxAdsPerSession})に達しました`);
    return 0;
  }
  
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) {
    // デフォルト値
    const defaultProb = adType === 'banner' 
      ? AD_CONFIG.banner.baseDisplayProbability * adFrequencyFactor
      : AD_CONFIG.interstitial.baseDisplayProbability * adFrequencyFactor;
    logAdInfo(`モデル(${modelId})が見つからないため、デフォルト確率を使用: ${defaultProb}`);
    return defaultProb;
  }
  
  // モデルのコスト係数に基づいて確率を調整
  const baseProb = adType === 'banner' 
    ? AD_CONFIG.banner.baseDisplayProbability
    : AD_CONFIG.interstitial.baseDisplayProbability;
  
  const modelMultiplier = getModelMultiplier(model.costFactor);
  
  // 最終的な確率を計算（0.0〜1.0の範囲に収める）
  const finalProb = Math.min(1.0, Math.max(0.0, baseProb * modelMultiplier * adFrequencyFactor));
  logAdInfo(`広告表示確率計算: モデル=${modelId}, タイプ=${adType}, 基本確率=${baseProb}, モデル係数=${modelMultiplier}, 頻度係数=${adFrequencyFactor}, 最終確率=${finalProb}`);
  return finalProb;
}

// 広告を表示すべきかどうかを決定する関数
export function shouldShowAd(modelId: string, adType: 'banner' | 'interstitial' = 'banner'): boolean {
  // 広告が無効の場合はfalseを返す
  if (!isAdsEnabled) {
    logAdInfo('広告が無効化されているため表示しません');
    return false;
  }
  
  // デバッグモードでは常に表示
  if (showDummyAds) {
    logAdInfo('ダミー広告モードが有効なため表示します');
    return true;
  }
  
  // インタースティシャル広告の場合、前回の表示からの経過時間をチェック
  if (adType === 'interstitial') {
    const now = Date.now();
    const timeSinceLastDisplay = now - lastInterstitialDisplayTime;
    
    if (timeSinceLastDisplay < AD_CONFIG.interstitial.minTimeBetweenDisplays) {
      logAdInfo(`インタースティシャル広告の表示間隔が短すぎます: 経過時間=${timeSinceLastDisplay}ms, 必要間隔=${AD_CONFIG.interstitial.minTimeBetweenDisplays}ms`);
      return false;
    }
  }
  
  const probability = calculateAdProbability(modelId, adType);
  const randomValue = Math.random();
  const shouldShow = randomValue < probability;
  logAdInfo(`広告表示判定: タイプ=${adType}, 確率=${probability}, 乱数=${randomValue}, 表示=${shouldShow}`);
  return shouldShow;
}

// 広告表示をカウント
export function trackAdDisplay(adType: 'banner' | 'interstitial' = 'banner'): void {
  sessionAdDisplayCount++;
  
  if (adType === 'interstitial') {
    lastInterstitialDisplayTime = Date.now();
  }
  
  logAdInfo(`広告表示をカウント: タイプ=${adType}, 合計表示回数=${sessionAdDisplayCount}`);
}

// 広告初期化
export function initializeAds(): void {
  // 広告が無効の場合は初期化しない
  if (!isAdsEnabled) {
    logAdInfo('広告が無効化されているため初期化をスキップします');
    return;
  }
  
  // セッションカウンターをリセット
  sessionAdDisplayCount = 0;
  lastInterstitialDisplayTime = 0;
  
  // Web広告の初期化処理（必要に応じて実装）
  logAdInfo(`Web広告を初期化しました (モード: ${isDebugMode ? 'デバッグ' : '本番'})`);
}

// バナー広告フック
export function useBannerAd(modelId: string) {
  const [showAd, setShowAd] = useState(false);
  
  useEffect(() => {
    // 広告が無効の場合は表示しない
    if (!isAdsEnabled) {
      logAdInfo('バナー広告: 広告が無効化されているため表示しません');
      setShowAd(false);
      return;
    }
    
    // デバッグモードでは常に表示
    if (showDummyAds) {
      logAdInfo('バナー広告: ダミー広告モードが有効なため表示します');
      setShowAd(true);
      return;
    }
    
    // モデルに基づいて広告表示を決定
    const shouldShow = shouldShowAd(modelId, 'banner');
    setShowAd(shouldShow);
    
    if (shouldShow) {
      logAdInfo(`バナー広告: 表示します (モデル=${modelId})`);
      trackAdDisplay('banner');
    } else {
      logAdInfo(`バナー広告: 表示しません (モデル=${modelId})`);
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
      logAdInfo('インタースティシャル広告: 広告が無効化されているため表示しません');
      setShouldShow(false);
      return;
    }
    
    // デバッグモードでは常に表示
    if (showDummyAds) {
      logAdInfo('インタースティシャル広告: ダミー広告モードが有効なため表示します');
      setShouldShow(true);
      return;
    }
    
    // モデルに基づいて広告表示を決定
    const shouldDisplayAd = shouldShowAd(modelId, 'interstitial');
    setShouldShow(shouldDisplayAd);
    logAdInfo(`インタースティシャル広告: 読み込み状態=${shouldDisplayAd} (モデル=${modelId})`);
  }, [modelId]);
  
  const showInterstitial = () => {
    if (shouldShow && isAdsEnabled) {
      if (showDummyAds) {
        // デバッグモードではダミー広告を表示
        logAdInfo('インタースティシャル広告: ダミー広告を表示します');
        setIsVisible(true);
        trackAdDisplay('interstitial');
        return true;
      }
      // 本番モードでは実際の広告を表示
      logAdInfo('インタースティシャル広告: 実際の広告を表示します');
      trackAdDisplay('interstitial');
      return true;
    }
    logAdInfo('インタースティシャル広告: 表示条件を満たしていないため表示しません');
    return false;
  };
  
  const closeInterstitial = () => {
    logAdInfo('インタースティシャル広告: 閉じます');
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