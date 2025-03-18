/**
 * 画像処理ユーティリティ関数
 */

/**
 * 画像ファイルを圧縮する
 * @param file 圧縮する画像ファイル
 * @param options 圧縮オプション
 * @returns 圧縮された画像ファイル
 */
export const compressImage = async (
  file: File, 
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeThreshold?: number; // バイト単位。この値より小さい場合は圧縮しない
    targetSize?: number; // 目標サイズ（バイト単位）
  } = {}
): Promise<File> => {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.7,
    format = 'image/jpeg',
    sizeThreshold = 5 * 1024 * 1024, // デフォルト5MB
    targetSize
  } = options;

  // サイズが閾値以下なら圧縮しない
  if (file.size <= sizeThreshold && !targetSize) {
    console.log(`ファイルサイズ ${file.size / 1024 / 1024}MB は閾値 ${sizeThreshold / 1024 / 1024}MB 以下のため圧縮をスキップします`);
    return file;
  }

  // 画像をロード
  const loadImage = (): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // CORSエラー対策
            img.src = event.target?.result as string;
            img.onload = () => resolve(img);
            img.onerror = (err) => {
              console.error('画像の読み込みエラー:', err);
              reject(new Error('画像の読み込みに失敗しました'));
            };
          } catch (err) {
            console.error('画像オブジェクト作成エラー:', err);
            reject(err);
          }
        };
        reader.onerror = (err) => {
          console.error('FileReader エラー:', err);
          reject(err);
        };
      } catch (err) {
        console.error('loadImage 全体エラー:', err);
        reject(err);
      }
    });
  };

  // 画像をキャンバスに描画
  const drawImageToCanvas = (img: HTMLImageElement, width: number, height: number): HTMLCanvasElement => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('2Dコンテキストを取得できませんでした');
        // フォールバックとして空のキャンバスを返す
        return canvas;
      }
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    } catch (err) {
      console.error('キャンバス描画エラー:', err);
      // エラー時は空のキャンバスを返す
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = Math.min(width, 800); // モバイルデバイスでも安全なサイズ
      fallbackCanvas.height = Math.min(height, 800);
      return fallbackCanvas;
    }
  };

  // ターゲットサイズまで圧縮を繰り返す関数
  const compressToTargetSize = async (
    img: HTMLImageElement, 
    initialWidth: number, 
    initialHeight: number, 
    targetSizeBytes: number
  ): Promise<File> => {
    let currentQuality = 0.9; // 高品質から開始
    let currentWidth = initialWidth;
    let currentHeight = initialHeight;
    let resultBlob: Blob | null = null;
    let resultFile: File | null = null;
    let attemptCount = 0;
    const maxAttempts = 10; // 最大試行回数

    // 最初に画像をリサイズ
    if (initialWidth > maxWidth) {
      currentHeight = Math.round(initialHeight * (maxWidth / initialWidth));
      currentWidth = maxWidth;
    }
    
    if (currentHeight > maxHeight) {
      currentWidth = Math.round(currentWidth * (maxHeight / currentHeight));
      currentHeight = maxHeight;
    }

    // ブロブを取得する関数
    const getBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
      return new Promise((resolve) => {
        try {
          // モバイルデバイスでのメモリ使用量制限
          const maxDimension = 2048; // 多くのモバイルデバイスで安全な上限
          let finalCanvas = canvas;
          
          // キャンバスサイズが大きすぎる場合は縮小
          if (canvas.width > maxDimension || canvas.height > maxDimension) {
            console.log(`キャンバスサイズが大きすぎるため縮小します: ${canvas.width}x${canvas.height} -> 最大${maxDimension}px`);
            const tempCanvas = document.createElement('canvas');
            let newWidth = canvas.width;
            let newHeight = canvas.height;
            
            if (canvas.width > canvas.height) {
              newWidth = maxDimension;
              newHeight = Math.floor(canvas.height * (maxDimension / canvas.width));
            } else {
              newHeight = maxDimension;
              newWidth = Math.floor(canvas.width * (maxDimension / canvas.height));
            }
            
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.drawImage(canvas, 0, 0, newWidth, newHeight);
            finalCanvas = tempCanvas;
          }
          
          // タイムアウト設定（10秒で処理が完了しない場合は中断）
          const timeoutId = setTimeout(() => {
            console.warn('Blob取得がタイムアウトしました');
            resolve(null);
          },
          10000);
          
          finalCanvas.toBlob(
            (blob) => {
              clearTimeout(timeoutId);
              resolve(blob);
            },
            format,
            quality
          );
        } catch (err) {
          console.error('Blob取得エラー:', err);
          resolve(null);
        }
      });
    };

    // まずサイズ調整だけで圧縮を試みる
    const canvas = drawImageToCanvas(img, currentWidth, currentHeight);
    resultBlob = await getBlob(canvas, currentQuality);
    
    if (!resultBlob || (targetSizeBytes && resultBlob.size > targetSizeBytes)) {
      // 品質を下げながら圧縮を繰り返す
      while (attemptCount < maxAttempts) {
        attemptCount++;
        
        // ブロブがない、またはサイズが大きすぎる場合は品質を下げる
        if (!resultBlob || (targetSizeBytes && resultBlob.size > targetSizeBytes)) {
          // 次の品質レベルを計算
          // 目標サイズとの差に応じて品質を調整
          if (resultBlob) {
            const ratio = targetSizeBytes / resultBlob.size;
            currentQuality = Math.max(0.1, Math.min(0.9, currentQuality * Math.sqrt(ratio)));
          } else {
            currentQuality = Math.max(0.1, currentQuality - 0.1);
          }
          
          // 非常に大きい画像の場合はサイズも縮小
          if (attemptCount > 5 && currentWidth > 800) {
            currentWidth = Math.floor(currentWidth * 0.8);
            currentHeight = Math.floor(currentHeight * 0.8);
            
            // 新しいキャンバスを作成
            const newCanvas = drawImageToCanvas(img, currentWidth, currentHeight);
            resultBlob = await getBlob(newCanvas, currentQuality);
          } else {
            resultBlob = await getBlob(canvas, currentQuality);
          }
          
          console.log(`圧縮試行 ${attemptCount}: 品質=${currentQuality.toFixed(2)}, サイズ=${resultBlob?.size ? `${(resultBlob.size / 1024 / 1024).toFixed(2)}MB` : 'N/A'}`);
        } else {
          // 目標サイズ以下になったら終了
          break;
        }
      }
    }

    // 圧縮結果を返す
    if (resultBlob) {
      resultFile = new File(
        [resultBlob],
        file.name,
        { type: format, lastModified: Date.now() }
      );
      return resultFile;
    }
    
    // 圧縮に失敗した場合は元のファイルを返す
    return file;
  };

  // メイン処理
  try {
    const img = await loadImage();
    
    // 目標サイズが指定されている場合は適応的に圧縮
    if (targetSize) {
      return await compressToTargetSize(img, img.width, img.height, targetSize);
    }
    
    // 通常の圧縮処理
    let width = img.width;
    let height = img.height;
    
    // 大きすぎる画像はリサイズ
    if (width > maxWidth) {
      height = Math.round(height * (maxWidth / width));
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = Math.round(width * (maxHeight / height));
      height = maxHeight;
    }
    
    const canvas = drawImageToCanvas(img, width, height);
    
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 新しいFileオブジェクトを作成
            const compressedFile = new File(
              [blob],
              file.name,
              { type: format, lastModified: Date.now() }
            );
            resolve(compressedFile);
          } else {
            // 圧縮に失敗した場合は元のファイルを使用
            resolve(file);
          }
        },
        format,
        quality
      );
    });
  } catch (error) {
    console.error('画像圧縮エラー:', error);
    return file; // エラー時は元のファイルを返す
  }
};

/**
 * 画像ファイルをBase64文字列に変換する
 * @param file 変換する画像ファイル
 * @returns Base64形式の文字列
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 画像ファイルを圧縮してBase64形式に変換する
 * @param file 画像ファイル
 * @param compressOptions 圧縮オプション
 * @returns 圧縮されたBase64形式の画像
 */
export const processImageFile = async (
  file: File,
  compressOptions?: Parameters<typeof compressImage>[1]
): Promise<{ base64: string; file: File }> => {
  try {
    // モバイルデバイス検出
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // モバイルデバイスの場合、より保守的な設定を適用
    const mobileOptions = isMobile ? {
      maxWidth: 1200, // モバイルでは小さめに
      maxHeight: 1200,
      quality: 0.6,   // 品質も少し下げる
      ...compressOptions
    } : compressOptions;
    
    // まずファイルが処理可能かチェック
    if (file.size > 100 * 1024 * 1024) { // 100MB超は処理しない
      console.warn('ファイルが大きすぎるため、圧縮せずに返します');
      return { 
        base64: await fileToBase64(file),
        file 
      };
    }
    
    console.time('画像圧縮処理');
    const compressedFile = await compressImage(file, mobileOptions);
    console.timeEnd('画像圧縮処理');
    
    console.time('Base64変換');
    const base64 = await fileToBase64(compressedFile);
    console.timeEnd('Base64変換');
    
    return { base64, file: compressedFile };
  } catch (error) {
    console.error('画像処理全体のエラー:', error);
    // エラー時は元のファイルをそのまま返す
    try {
      return { 
        base64: await fileToBase64(file),
        file 
      };
    } catch (e) {
      // Base64変換もできない場合は空のデータを返す
      console.error('Base64変換にも失敗:', e);
      throw new Error('画像処理に失敗しました');
    }
  }
}; 