import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    END,
    assembleFinalReport,
    buildReportGraph,
    executeWebSearch,
    generateQueries,
    generateReportPlan,
    gradeSection,
    humanFeedback,
    writeFinalSection,
    writeSectionFromSources
} from '../graph';
import type { ReportState, Section, SectionState } from '../state';
import * as utils from '../utils';

// モック
vi.mock('../utils', () => ({
  getConfigValue: vi.fn(val => val),
  getSearchParams: vi.fn(() => ({})),
  selectAndExecuteSearch: vi.fn(async () => []),
  formatSearchResults: vi.fn(() => 'モック検索結果'),
  formatSections: vi.fn(sections => JSON.stringify(sections))
}));

describe('Graph関数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReportPlan', () => {
    it('有効なレポート計画を生成する', async () => {
      const state: ReportState = {
        topic: 'テストトピック',
        feedback_on_report_plan: '',
        sections: [],
        completed_sections: [],
        report_sections_from_research: '',
        final_report: ''
      };
      
      const config = {
        configurable: {
          reportStructure: '標準レポート構造',
          searchApi: 'tavily',
          numberOfQueries: 3
        }
      };
      
      const result = await generateReportPlan(state, config);
      
      expect(result.sections).toBeDefined();
      expect(result.sections?.length).toBeGreaterThan(0);
      expect(utils.selectAndExecuteSearch).toHaveBeenCalled();
    });
  });

  describe('humanFeedback', () => {
    it('フィードバックを適切に処理する', () => {
      const state: ReportState = {
        topic: 'テストトピック',
        feedback_on_report_plan: '',
        sections: [
          {
            name: 'テストセクション',
            description: 'テスト説明',
            research: true,
            content: ''
          }
        ],
        completed_sections: [],
        report_sections_from_research: '',
        final_report: ''
      };
      
      const result = humanFeedback(state, {});
      
      expect(result).toBeDefined();
      expect(result.goto).toBeDefined();
    });
  });

  describe('generateQueries', () => {
    it('セクションに基づいて検索クエリを生成する', async () => {
      const section: Section = {
        name: 'テストセクション',
        description: 'テスト説明',
        research: true,
        content: ''
      };
      
      const state: SectionState = {
        topic: 'テストトピック',
        section,
        search_iterations: 0,
        search_queries: [],
        source_str: '',
        report_sections_from_research: '',
        completed_sections: []
      };
      
      const config = {
        configurable: {
          numberOfQueries: 3
        }
      };
      
      const result = await generateQueries(state, config);
      
      expect(result.search_queries).toBeDefined();
      expect(result.search_queries?.length).toBeGreaterThan(0);
    });
  });

  describe('executeWebSearch', () => {
    it('検索クエリを実行して結果を取得する', async () => {
      const state: SectionState = {
        topic: 'テストトピック',
        section: {
          name: 'テストセクション',
          description: 'テスト説明',
          research: true,
          content: ''
        },
        search_iterations: 0,
        search_queries: [
          { search_query: 'テストクエリ1' },
          { search_query: 'テストクエリ2' }
        ],
        source_str: '',
        report_sections_from_research: '',
        completed_sections: []
      };
      
      const result = await executeWebSearch(state, {});
      
      expect(result.source_str).toBeDefined();
      expect(result.search_iterations).toBe(1);
      expect(utils.selectAndExecuteSearch).toHaveBeenCalledTimes(2);
    });
  });

  describe('writeSectionFromSources', () => {
    it('検索結果に基づいてセクションを作成する', async () => {
      const state: SectionState = {
        topic: 'テストトピック',
        section: {
          name: 'テストセクション',
          description: 'テスト説明',
          research: true,
          content: ''
        },
        search_iterations: 1,
        search_queries: [],
        source_str: 'テスト検索結果',
        report_sections_from_research: '',
        completed_sections: []
      };
      
      const result = await writeSectionFromSources(state, {});
      
      expect(result.section).toBeDefined();
      expect(result.section?.content).toBeTruthy();
      expect(result.completed_sections).toBeDefined();
      expect(result.completed_sections?.length).toBe(1);
    });
  });

  describe('gradeSection', () => {
    it('セクションを評価して次のステップを決定する', async () => {
      const state: SectionState = {
        topic: 'テストトピック',
        section: {
          name: 'テストセクション',
          description: 'テスト説明',
          research: true,
          content: 'テストコンテンツ'
        },
        search_iterations: 1,
        search_queries: [],
        source_str: '',
        report_sections_from_research: '',
        completed_sections: []
      };
      
      const result = await gradeSection(state, {});
      
      expect(result.goto).toBeDefined();
      // 合格の場合はENDを返す、不合格の場合はexecuteWebSearchを返す
      expect([END, 'executeWebSearch']).toContain(result.goto);
    });
  });

  describe('writeFinalSection', () => {
    it('最終セクションを作成する', async () => {
      const state: SectionState = {
        topic: 'テストトピック',
        section: {
          name: '結論',
          description: 'テスト結論',
          research: false,
          content: ''
        },
        search_iterations: 0,
        search_queries: [],
        source_str: '',
        report_sections_from_research: 'これまでのセクション内容',
        completed_sections: []
      };
      
      const result = await writeFinalSection(state, {});
      
      expect(result.section).toBeDefined();
      expect(result.section?.content).toBeTruthy();
      expect(result.completed_sections).toBeDefined();
      expect(result.completed_sections?.length).toBe(1);
      expect(result.goto).toBe(END);
    });
  });

  describe('assembleFinalReport', () => {
    it('すべてのセクションから最終レポートを生成する', () => {
      const sections = [
        {
          name: '序論',
          description: 'テスト序論',
          research: true,
          content: 'テスト序論内容'
        },
        {
          name: '本論',
          description: 'テスト本論',
          research: true,
          content: 'テスト本論内容'
        },
        {
          name: '結論',
          description: 'テスト結論',
          research: false,
          content: 'テスト結論内容'
        }
      ];
      
      const state: ReportState = {
        topic: 'テストトピック',
        feedback_on_report_plan: '',
        sections: [],
        completed_sections: sections,
        report_sections_from_research: '',
        final_report: ''
      };
      
      const result = assembleFinalReport(state, {});
      
      expect(result.final_report).toBeDefined();
      expect(result.final_report).toContain('テストトピック');
      // 序論が最初、結論が最後にあることを確認
      const finalReport = result.final_report || '';
      const firstSectionIndex = finalReport.indexOf('序論');
      const lastSectionIndex = finalReport.indexOf('結論');
      expect(firstSectionIndex).toBeLessThan(lastSectionIndex);
    });
  });

  describe('buildReportGraph', () => {
    it('有効なグラフ構造を構築する', () => {
      const graph = buildReportGraph();
      
      expect(graph.startNode).toBe('generateReportPlan');
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      
      // 各ノードと各エッジが適切に設定されていることを確認
      expect(graph.nodes.map(n => n.id)).toContain('generateReportPlan');
      expect(graph.nodes.map(n => n.id)).toContain('humanFeedback');
      
      // エッジが正しく連結されていることを確認
      const edgeStarts = graph.edges.map(e => e.from);
      expect(edgeStarts).toContain('generateReportPlan');
    });
  });
}); 