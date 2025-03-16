import { AD_CONFIG } from '@/config/ads';
import { useEffect, useState } from 'react';

interface DummyBannerAdProps {
  className?: string;
  modelId?: string;
  rotationInterval?: number;
}

// ダミー広告のバリエーション
const DUMMY_AD_VARIANTS = [
  {
    title: "デバッグモード広告",
    description: "これはテスト用のダミー広告です",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  {
    title: "開発者向け広告",
    description: "実際の広告はプロダクションモードで表示されます",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  {
    title: "テスト広告",
    description: "広告表示のレイアウトテスト中",
    bgColor: "bg-purple-100 dark:bg-purple-900",
  }
];

export function DummyBannerAd({ 
  className = '', 
  modelId,
  rotationInterval = AD_CONFIG.banner.dummyRotationInterval 
}: DummyBannerAdProps) {
  const [adVariant, setAdVariant] = useState(0);
  
  // 定期的に広告を切り替える
  useEffect(() => {
    const interval = setInterval(() => {
      setAdVariant((prev) => (prev + 1) % DUMMY_AD_VARIANTS.length);
    }, rotationInterval);
    
    return () => clearInterval(interval);
  }, [rotationInterval]);
  
  const currentAd = DUMMY_AD_VARIANTS[adVariant];
  
  return (
    <div className={`${className} ${currentAd.bgColor} p-3 rounded-lg border border-dashed border-gray-400 dark:border-gray-600 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{currentAd.title}</h3>
          <p className="text-xs opacity-80">{currentAd.description}</p>
          {modelId && (
            <p className="text-xs mt-1 opacity-70">モデル: {modelId}</p>
          )}
        </div>
        <div className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
          デバッグ広告
        </div>
      </div>
    </div>
  );
} 