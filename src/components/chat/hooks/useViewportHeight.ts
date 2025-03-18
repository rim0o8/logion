import { useEffect, useState } from "react";

export function useViewportHeight() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(0);

  useEffect(() => {
    const setInitialHeight = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    setInitialHeight();

    // visualViewportのリサイズイベントを監視（モバイルキーボード対応）
    const handleResize = () => {
      if (window.visualViewport) {
        const newHeight = window.visualViewport.height;
        // キーボードが表示されたかどうかを判定
        const heightDifference = window.innerHeight - newHeight;
        setIsKeyboardVisible(heightDifference > 150); // 150px以上の差があればキーボードが表示されたと判断
        setViewportHeight(newHeight);
      }
    };

    // visualViewportが利用可能な場合はそれを使用
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      // フォールバックとしてwindowのリサイズイベントを使用
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // キーボードが表示されている時のスタイル調整
  const keyboardAdjustStyle = isKeyboardVisible ? {
    paddingBottom: `calc(${viewportHeight * 0.4}px)`,
    height: `${viewportHeight}px`,
    maxHeight: `${viewportHeight}px`,
    transition: 'padding-bottom 0.2s ease-out'
  } : {};

  return { isKeyboardVisible, viewportHeight, keyboardAdjustStyle };
} 