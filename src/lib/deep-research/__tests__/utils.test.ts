import { describe, expect, it } from 'vitest';
import { SearchAPI } from '../configuration';
import type { SearchResult, Section } from '../state';
import {
    cleanText,
    decodeHtmlEntities,
    formatSearchResults,
    formatSections,
    getConfigValue,
    getSearchParams
} from '../utils';

describe('Utils関数', () => {
  describe('getConfigValue', () => {
    it('文字列をそのまま返す', () => {
      expect(getConfigValue('test-value')).toBe('test-value');
    });

    it('SearchAPI enumを文字列に変換して返す', () => {
      expect(getConfigValue(SearchAPI.TAVILY)).toBe('tavily');
    });
  });

  describe('getSearchParams', () => {
    it('空のオブジェクトを返す（設定がない場合）', () => {
      expect(getSearchParams('exa')).toEqual({});
    });

    it('APIに合わせて設定をフィルタリングする', () => {
      const config = {
        maxResults: 10,
        includeRawContent: true,
        topKResults: 5,
        additionalParam: 'value'
      };

      // exaに対してはmaxResultsとincludeDomainsが受け入れられる
      expect(getSearchParams('exa', config)).toEqual({
        max_results: 10
      });

      // pubmedに対してはtopKResultsが受け入れられる
      expect(getSearchParams('pubmed', config)).toEqual({
        top_k_results: 5
      });
    });

    it('存在しないAPIに対しては空のオブジェクトを返す', () => {
      const config = { maxResults: 10 };
      expect(getSearchParams('non-existent-api', config)).toEqual({});
    });
  });

  describe('formatSearchResults', () => {
    it('検索結果がない場合は適切なメッセージを返す', () => {
      expect(formatSearchResults([])).toContain('検索結果はありません');
    });

    it('検索結果を見やすくフォーマットする', () => {
      const results: SearchResult[] = [
        {
          title: 'テストタイトル1',
          url: 'https://example.com/1',
          content: 'テストコンテンツ1'
        },
        {
          title: 'テストタイトル2',
          url: 'https://example.com/2',
          content: 'テストコンテンツ2'
        }
      ];

      const formatted = formatSearchResults(results);
      
      expect(formatted).toContain('【検索結果 1】');
      expect(formatted).toContain('テストタイトル1');
      expect(formatted).toContain('https://example.com/1');
      expect(formatted).toContain('テストコンテンツ1');
      
      expect(formatted).toContain('【検索結果 2】');
      expect(formatted).toContain('テストタイトル2');
    });
  });

  describe('formatSections', () => {
    it('セクションを整形されたJSON文字列に変換する', () => {
      const sections: Section[] = [
        {
          name: 'セクション1',
          description: '説明1',
          research: true,
          content: 'コンテンツ1'
        },
        {
          name: 'セクション2',
          description: '説明2',
          research: false,
          content: 'コンテンツ2'
        }
      ];

      const formatted = formatSections(sections);
      const parsed = JSON.parse(formatted);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('セクション1');
      expect(parsed[1].research).toBe(false);
    });
  });

  describe('cleanText', () => {
    it('余分な空白を削除する', () => {
      const text = '  テスト   テキスト  \n\n  複数行  ';
      expect(cleanText(text)).toBe('テスト テキスト 複数行');
    });
  });

  describe('decodeHtmlEntities', () => {
    it('HTMLエンティティをデコードする', () => {
      expect(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
    });
  });
}); 