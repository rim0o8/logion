import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Configuration, SearchAPI } from '../configuration';

describe('Configuration クラス', () => {
  // 環境変数のモックのセットアップと削除
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('コンストラクタ', () => {
    it('デフォルト値で初期化される', () => {
      const config = new Configuration();
      
      expect(config.reportStructure).toBeDefined();
      expect(config.searchApi).toBe(SearchAPI.TAVILY);
      expect(config.writerProvider).toBe('openai');
      expect(config.writerModel).toBe('gpt-4-turbo');
      expect(config.plannerProvider).toBe('anthropic');
      expect(config.plannerModel).toBe('claude-3-7-sonnet-latest');
      expect(config.numberOfQueries).toBe(3);
    });

    it('初期値でオーバーライドできる', () => {
      const config = new Configuration({
        searchApi: SearchAPI.EXA,
        writerProvider: 'anthropic',
        writerModel: 'claude-3-5-sonnet',
        numberOfQueries: 2,
      });
      
      expect(config.searchApi).toBe(SearchAPI.EXA);
      expect(config.writerProvider).toBe('anthropic');
      expect(config.writerModel).toBe('claude-3-5-sonnet');
      expect(config.numberOfQueries).toBe(2);
    });
  });

  describe('fromRunnableConfig静的メソッド', () => {
    it('configurable オブジェクトからインスタンスを作成できる', () => {
      const runnable = {
        configurable: {
          searchApi: 'perplexity',
          writerProvider: 'anthropic',
          numberOfQueries: 4,
        }
      };
      
      const config = Configuration.fromRunnableConfig(runnable);
      
      expect(config.searchApi).toBe(SearchAPI.PERPLEXITY);
      expect(config.writerProvider).toBe('anthropic');
      expect(config.numberOfQueries).toBe(4);
    });

    it('configurable が存在しない場合はデフォルト値を使用', () => {
      const runnable = {};
      
      const config = Configuration.fromRunnableConfig(runnable);
      
      expect(config.searchApi).toBe(SearchAPI.TAVILY);
      expect(config.writerProvider).toBe('openai');
    });
  });

  describe('環境変数', () => {
    it('環境変数の設定を反映する', () => {
      process.env.SEARCH_API = 'exa';
      process.env.WRITER_PROVIDER = 'anthropic';
      process.env.NUMBER_OF_QUERIES = '5';
      
      const config = new Configuration();
      
      expect(config.searchApi).toBe(SearchAPI.EXA);
      expect(config.writerProvider).toBe('anthropic');
      expect(config.numberOfQueries).toBe(5);
    });

    it('環境変数が無効な値の場合はデフォルト値を使用', () => {
      process.env.SEARCH_API = 'invalid_api';
      process.env.NUMBER_OF_QUERIES = 'not_a_number';
      
      const config = new Configuration();
      
      expect(config.searchApi).toBe(SearchAPI.TAVILY); // デフォルト値
      expect(config.numberOfQueries).toBe(3); // デフォルト値
    });
  });

  describe('searchApiConfig プロパティ', () => {
    it('検索APIごとの設定が正しく構築される', () => {
      const config = new Configuration({
        searchApiConfig: {
          apiKey: 'test-api-key'
        }
      });
      
      expect(config.searchApiConfig).toEqual({
        apiKey: 'test-api-key'
      });
    });
  });
}); 