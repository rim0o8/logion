/**
 * 広告表示に関する設定ファイル
 */

// 広告表示の基本設定
export const AD_CONFIG = {
  // バナー広告の設定
  banner: {
    // バナー広告の表示確率の基本値（0.0〜1.0）
    baseDisplayProbability: 0.5,
    
    // バナー広告の表示間隔（会話の数）
    // 例: 2なら2回の会話ごとに1回表示
    displayInterval: 1,
    
    // ダミー広告の切り替え間隔（ミリ秒）
    dummyRotationInterval: 5000,
    
    // 広告の最大表示時間（ミリ秒、0は無制限）
    maxDisplayTime: 0,
  },
  
  // インタースティシャル広告の設定
  interstitial: {
    // インタースティシャル広告の表示確率の基本値（0.0〜1.0）
    baseDisplayProbability: 0.3,
    
    // インタースティシャル広告の表示間隔（会話の数）
    // 例: 3なら3回の会話ごとに1回表示
    displayInterval: 3,
    
    // 自動クローズまでの時間（秒）
    autoCloseTime: 5,
    
    // 同一セッション内での最大表示回数（0は無制限）
    maxDisplaysPerSession: 2,
    
    // 連続表示を防ぐための最小間隔（ミリ秒）
    minTimeBetweenDisplays: 60000, // 1分
  },
  
  // モデルごとの広告表示係数
  // costFactorに基づいて広告表示確率を調整
  modelFactors: {
    // 高価なモデルほど広告表示確率が高くなる
    probabilityMultiplier: {
      high: 1.5,    // 高価なモデル（costFactor >= 0.8）
      medium: 1.0,  // 中価格モデル（0.5 <= costFactor < 0.8）
      low: 0.5,     // 安価なモデル（costFactor < 0.5）
    },

    // モデルの価格帯の閾値
    thresholds: {
      high: 0.8,
      medium: 0.5,
    },
  },
  
  // 広告表示の制限
  limits: {
    // 1セッションあたりの最大広告表示回数（0は無制限）
    maxAdsPerSession: 10,
    
    // 連続した広告表示の最大数
    maxConsecutiveAds: 2,
    
    // 広告非表示までの最小会話数
    minConversationsBeforeAd: 1,
  },
} as const;

// 広告表示の種類
export enum AdDisplayType {
  // AIの発言の後に表示
  AFTER_ASSISTANT = 'after_assistant',
  
  // ユーザーの発言の後に表示
  AFTER_USER = 'after_user',
  
  // 会話の最後に表示
  END_OF_CONVERSATION = 'end_of_conversation',
}

// 現在の広告表示設定
export const CURRENT_AD_DISPLAY_TYPE = AdDisplayType.AFTER_ASSISTANT;

// 広告表示の頻度係数（環境変数から取得、デフォルトは1.0）
export const getAdFrequencyFactor = (): number => {
  const factor = process.env.NEXT_PUBLIC_AD_FREQUENCY_FACTOR;
  if (!factor) return 1.0;
  
  const parsed = Number.parseFloat(factor);
  return Number.isNaN(parsed) ? 1.0 : parsed;
}; 