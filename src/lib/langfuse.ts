import { Config } from '@/utils/config';
import { Langfuse } from 'langfuse';

// シングルトンインスタンスを作成
let langfuseInstance: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!langfuseInstance) {
    try {
      langfuseInstance = new Langfuse({
        secretKey: Config.LANGFUSE_SECRET_KEY,
        publicKey: Config.LANGFUSE_PUBLIC_KEY,
        baseUrl: Config.LANGFUSE_BASEURL,
      });
    } catch (error) {
      console.error('Langfuseの初期化に失敗しました:', error);
      // フォールバックとして機能しないインスタンスを返す
      return {
        trace: () => ({
          generation: () => ({
            end: () => {},
          }),
          span: () => ({
            end: () => {},
          }),
          event: () => {},
        }),
        shutdownAsync: async () => {},
        flushAsync: async () => {},
      } as unknown as Langfuse;
    }
  }
  return langfuseInstance;
}

// サーバーレス環境でのシャットダウン処理
export async function flushLangfuse(): Promise<void> {
  if (langfuseInstance) {
    try {
      await langfuseInstance.flushAsync();
    } catch (error) {
      console.error('Langfuseのフラッシュに失敗しました:', error);
    }
  }
} 