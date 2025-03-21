'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export interface ResearchResultProps {
  result: string;
  onNewSearch: () => void;
}

export const ResearchResult = ({ result, onNewSearch }: ResearchResultProps) => {
  // Download functionality
  const handleDownload = () => {
    // Save report as a Markdown file
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Research Results</CardTitle>
        <div className="space-x-2">
          <Button onClick={handleDownload} variant="outline" size="sm">
            Download Report
          </Button>
          <Button onClick={onNewSearch} variant="outline" size="sm">
            New Search
          </Button>
        </div>
      </CardHeader>
      <CardContent className="prose prose-sm md:prose-base max-w-none">
        <ReactMarkdown>{result}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}; 