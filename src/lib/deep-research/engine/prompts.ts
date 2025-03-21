import { PromptTemplate } from "@langchain/core/prompts";

// 検索クエリ生成のプロンプト
export const SEARCH_QUERIES_PROMPT = PromptTemplate.fromTemplate(`You are an expert research assistant. Generate 5 effective search queries for the following topic.
Each query should be on a separate line and explore diverse perspectives on the topic.

Research Topic: {query}

Provide thoughtful search queries that will yield good results.

Search Queries:`);

// コンテンツ分析のプロンプト
export const ANALYZE_CONTENT_PROMPT = PromptTemplate.fromTemplate(`You are an expert research assistant. Analyze the following web content and extract relevant information related to the specified research topic.
Provide a concise and objective analysis based on facts from the source.

Research Topic: {researchTopic}
Page Title: {title}
URL: {url}

Content:
{text}

Ensure that all insights, evaluations, and extracted information are presented clearly.

Analysis:`);

// リフレクションのプロンプト
export const REFLECTION_PROMPT = PromptTemplate.fromTemplate(`You are an expert research assistant tasked with reflecting on the current state of research to identify gaps and next steps.
First, summarize what you've learned so far about the research topic. Then, identify:
1. What important questions remain unanswered?
2. What perspectives or angles haven't been explored yet?
3. What contradictions or inconsistencies exist in the information gathered?
4. What additional information would strengthen the research?

Research Topic: {researchTopic}

Current Research Findings:
{currentFindings}

Be thoughtful and critical in your assessment, providing specific directions for further investigation.

Reflection:`);

// 研究方向の洗練化プロンプト
export const REFINE_RESEARCH_PROMPT = PromptTemplate.fromTemplate(`You are an expert research assistant. Review the information collected so far and identify important aspects or missing perspectives that should be further investigated.
Provide suggestions for deeper understanding considering these new perspectives.

Research Topic: {researchTopic}

Findings collected so far:
{currentFindings}

Provide thoughtful aspects to explore further.

Aspects to explore further:`);

// 最終レポート生成プロンプト
export const FINAL_REPORT_PROMPT = PromptTemplate.fromTemplate(`You are an expert research assistant. Create a comprehensive and structured research report based on the findings below.
Include the following elements in your report:
1. Executive Summary
2. Key Findings (3-5 bullet points)
3. Detailed Analysis (divided into subsections)
4. Conclusions and Insights
5. Future Research Directions

Research Topic: {researchTopic}

Research Findings:
{allFindings}

Write the entire report in Japanese. Make sure all parts of the report, including headings, content, and analysis are thoroughly written in Japanese.

Research Report:`); 