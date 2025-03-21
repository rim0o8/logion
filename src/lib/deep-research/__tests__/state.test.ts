import { describe, expect, it } from 'vitest';
import type { Feedback, SearchQuery, Section } from '../state';
import {
    FeedbackSchema,
    QueriesSchema,
    SearchQuerySchema,
    SectionSchema,
    SectionsSchema
} from '../state';

describe('State スキーマ', () => {
  describe('SectionSchema', () => {
    it('有効なセクションデータを検証する', () => {
      const validSection: Section = {
        name: 'セクション名',
        description: 'セクションの説明',
        research: true,
        content: 'セクションのコンテンツ'
      };
      
      const result = SectionSchema.safeParse(validSection);
      expect(result.success).toBe(true);
    });
    
    it('無効なセクションデータを拒否する', () => {
      const invalidSection = {
        name: 'セクション名',
        description: 'セクションの説明',
        research: 'true', // 文字列ではなくbooleanであるべき
        content: 'セクションのコンテンツ'
      };
      
      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });
    
    it('必須フィールドが欠けている場合にエラーを返す', () => {
      const incompleteSection = {
        name: 'セクション名',
        description: 'セクションの説明'
        // researchとcontentが欠けている
      };
      
      const result = SectionSchema.safeParse(incompleteSection);
      expect(result.success).toBe(false);
    });
  });
  
  describe('SectionsSchema', () => {
    it('有効なセクション配列を検証する', () => {
      const validSections = {
        sections: [
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
        ]
      };
      
      const result = SectionsSchema.safeParse(validSections);
      expect(result.success).toBe(true);
    });
    
    it('空のセクション配列を許可する', () => {
      const emptySections = {
        sections: []
      };
      
      const result = SectionsSchema.safeParse(emptySections);
      expect(result.success).toBe(true);
    });
  });
  
  describe('SearchQuerySchema', () => {
    it('有効な検索クエリを検証する', () => {
      const validQuery: SearchQuery = {
        search_query: 'テスト検索クエリ'
      };
      
      const result = SearchQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });
    
    it('nullの検索クエリを許可する', () => {
      const nullQuery = {
        search_query: null
      };
      
      const result = SearchQuerySchema.safeParse(nullQuery);
      expect(result.success).toBe(true);
    });
  });
  
  describe('QueriesSchema', () => {
    it('有効なクエリ配列を検証する', () => {
      const validQueries = {
        queries: [
          { search_query: 'クエリ1' },
          { search_query: 'クエリ2' },
          { search_query: null }
        ]
      };
      
      const result = QueriesSchema.safeParse(validQueries);
      expect(result.success).toBe(true);
    });
  });
  
  describe('FeedbackSchema', () => {
    it('有効なフィードバックを検証する', () => {
      const validFeedback: Feedback = {
        grade: 'pass',
        follow_up_queries: [
          { search_query: 'フォローアップクエリ' }
        ]
      };
      
      const result = FeedbackSchema.safeParse(validFeedback);
      expect(result.success).toBe(true);
    });
    
    it('無効なグレードを拒否する', () => {
      const invalidFeedback = {
        grade: 'invalid', // 'pass'または'fail'のみ有効
        follow_up_queries: []
      };
      
      const result = FeedbackSchema.safeParse(invalidFeedback);
      expect(result.success).toBe(false);
    });
  });
}); 