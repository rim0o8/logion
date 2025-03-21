import { describe, expect, it } from 'vitest';
import {
    finalSectionWriterInstructions,
    queryWriterInstructions,
    reportPlannerInstructions,
    reportPlannerQueryWriterInstructions,
    sectionGraderInstructions,
    sectionWriterInputs,
    sectionWriterInstructions
} from '../prompts';

describe('プロンプトテンプレート', () => {
  describe('reportPlannerInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(reportPlannerInstructions).toBeDefined();
      expect(typeof reportPlannerInstructions).toBe('string');
    });
    
    it('プレースホルダーを含む', () => {
      expect(reportPlannerInstructions).toContain('{topic}');
      expect(reportPlannerInstructions).toContain('{report_organization}');
      expect(reportPlannerInstructions).toContain('{context}');
    });
  });
  
  describe('queryWriterInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(queryWriterInstructions).toBeDefined();
      expect(typeof queryWriterInstructions).toBe('string');
    });
    
    it('プレースホルダーを含む', () => {
      expect(queryWriterInstructions).toContain('{topic}');
      expect(queryWriterInstructions).toContain('{section_topic}');
      expect(queryWriterInstructions).toContain('{number_of_queries}');
    });
  });
  
  describe('reportPlannerQueryWriterInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(reportPlannerQueryWriterInstructions).toBeDefined();
      expect(typeof reportPlannerQueryWriterInstructions).toBe('string');
    });
    
    it('プレースホルダーを含む', () => {
      expect(reportPlannerQueryWriterInstructions).toContain('{topic}');
      expect(reportPlannerQueryWriterInstructions).toContain('{report_organization}');
      expect(reportPlannerQueryWriterInstructions).toContain('{number_of_queries}');
    });
  });
  
  describe('sectionWriterInputs', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(sectionWriterInputs).toBeDefined();
      expect(typeof sectionWriterInputs).toBe('string');
    });
    
    it('セクション入力の構造を示している', () => {
      expect(sectionWriterInputs).toContain('Topic');
      expect(sectionWriterInputs).toContain('Section');
      expect(sectionWriterInputs).toContain('Sources');
    });
  });
  
  describe('sectionWriterInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(sectionWriterInstructions).toBeDefined();
      expect(typeof sectionWriterInstructions).toBe('string');
    });
    
    it('プレースホルダーを含む', () => {
      expect(sectionWriterInstructions).toContain('{topic}');
      expect(sectionWriterInstructions).toContain('{section_topic}');
    });
    
    it('セクション作成の指示を含む', () => {
      expect(sectionWriterInstructions).toContain('完全で包括的なレポートセクション');
      expect(sectionWriterInstructions).toContain('提供された情報源に基づいて');
    });
  });
  
  describe('sectionGraderInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(sectionGraderInstructions).toBeDefined();
      expect(typeof sectionGraderInstructions).toBe('string');
    });
    
    it('評価基準を含む', () => {
      expect(sectionGraderInstructions).toContain('評価基準');
      expect(sectionGraderInstructions).toContain('包括性');
      expect(sectionGraderInstructions).toContain('正確性');
    });
  });
  
  describe('finalSectionWriterInstructions', () => {
    it('テンプレートが存在し文字列である', () => {
      expect(finalSectionWriterInstructions).toBeDefined();
      expect(typeof finalSectionWriterInstructions).toBe('string');
    });
    
    it('プレースホルダーを含む', () => {
      expect(finalSectionWriterInstructions).toContain('{topic}');
      expect(finalSectionWriterInstructions).toContain('{section_topic}');
      expect(finalSectionWriterInstructions).toContain('{report_sections}');
    });
    
    it('最終セクション作成の指示を含む', () => {
      expect(finalSectionWriterInstructions).toContain('最終セクション');
      expect(finalSectionWriterInstructions).toContain('既存の研究材料');
    });
  });
}); 