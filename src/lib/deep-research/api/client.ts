import type { ClientResearchParams, ResearchErrorResponse, ResearchResponse } from '../types';

// ディープリサーチAPIのエンドポイント
const API_URL = '/api/deep-research';

/**
 * サーバーにディープリサーチを依頼する（従来の方法）
 * @param params リサーチのパラメータ
 * @returns リサーチ結果
 */
export async function requestDeepResearch(params: ClientResearchParams): Promise<ResearchResponse> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json() as ResearchErrorResponse;
      throw new Error(errorData.message || 'リサーチリクエストに失敗しました');
    }

    const data = await response.json() as ResearchResponse;
    return data;
  } catch (error) {
    console.error('ディープリサーチAPIエラー:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('予期しないエラーが発生しました');
  }
}

/**
 * Server-Sent Eventsを使用してリアルタイムでリサーチを実行する
 * @param params リサーチのパラメータ
 * @param onProgress 進捗状況を受け取るコールバック
 * @returns レポート結果のPromise
 */
export function executeDeepResearchWithSSE(
  params: ClientResearchParams,
  onProgress: (message: string, progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // POSTリクエストの開始
      fetch(`${API_URL}?sse=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(params),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error('レスポンスボディがありません');
        }

        // ReadableStreamのリーダーを取得
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // ストリームからデータを読み込む関数
        function readStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              console.log('ストリーム終了');
              return;
            }

            // バッファにデータを追加して処理
            buffer += decoder.decode(value, { stream: true });
            
            // イベントを処理
            const eventDelimiter = '\n\n';
            const events = buffer.split(eventDelimiter);
            
            // 最後の不完全なイベントをバッファに残す
            buffer = events.pop() || '';
            
            // 各イベントを処理
            for (const eventData of events) {
              if (!eventData.trim()) continue;
              
              const eventLines = eventData.split('\n');
              let eventType = 'message';
              let data = '';
              
              for (const line of eventLines) {
                if (line.startsWith('event:')) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  data = line.slice(5).trim();
                }
              }
              
              // イベントタイプに応じた処理
              try {
                const parsedData = JSON.parse(data);
                
                if (eventType === 'progress') {
                  onProgress(parsedData.message, parsedData.progress);
                } else if (eventType === 'result') {
                  resolve(parsedData.report);
                  reader.cancel();
                  return;
                } else if (eventType === 'error') {
                  reject(new Error(parsedData.message || '研究プロセスでエラーが発生しました'));
                  reader.cancel();
                  return;
                }
              } catch (error) {
                console.error('イベントデータの解析エラー:', error);
              }
            }
            
            // 次のデータを読み込む
            readStream();
          }).catch(error => {
            reject(error);
          });
        }
        
        // ストリーム読み込みを開始
        readStream();
      }).catch(error => {
        console.error('ディープリサーチリクエストエラー:', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * ディープリサーチを実行するためのフック用ユーティリティ
 * @param params リサーチのパラメータ
 * @param onProgress 進捗状況を受け取るコールバック
 * @returns レポート結果
 */
export async function executeDeepResearch(
  params: ClientResearchParams,
  onProgress?: (message: string, progress: number) => void
): Promise<string> {
  try {
    // 進捗コールバックが提供されている場合はSSEを使用
    if (onProgress) {
      return await executeDeepResearchWithSSE(params, onProgress);
    }
    
    // 進捗コールバックがない場合は従来の方法を使用
    const result = await requestDeepResearch(params);
    return result.report;
  } catch (error) {
    console.error('ディープリサーチの実行エラー:', error);
    throw error;
  }
} 