import { DummyBannerAd } from "../ads/DummyBannerAd";
import { WebBannerAd } from "../ads/WebBannerAd";

/**
 * メッセージ間の広告コンポーネントのProps
 */
interface MessageAdProps {
  /** ダミー広告を表示するかどうか */
  isDummy: boolean;
  /** 広告ユニットID */
  adUnitId: string;
  /** 選択中のモデルID */
  modelId: string;
  /** ダミー広告の切り替え間隔 */
  rotationInterval: number;
}

/**
 * メッセージ間に表示する広告コンポーネント
 */
export function MessageAd({
  isDummy,
  adUnitId,
  modelId,
  rotationInterval
}: MessageAdProps) {
  return (
    <div className="w-full flex justify-center my-2 sm:my-3 opacity-95">
      {isDummy ? (
        <DummyBannerAd
          className="w-full max-w-3xl rounded-lg overflow-hidden shadow-sm"
          modelId={modelId}
          rotationInterval={rotationInterval}
        />
      ) : (
        <WebBannerAd
          adUnitId={adUnitId}
          className="w-full max-w-md h-16 rounded-lg overflow-hidden shadow-sm"
        />
      )}
    </div>
  );
} 