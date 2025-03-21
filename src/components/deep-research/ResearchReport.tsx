import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

interface ResearchReportProps {
  report: string;
  handleNewSearch: () => void;
}

export function ResearchReport({ report, handleNewSearch }: ResearchReportProps) {
  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
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
    <div className="mt-8">
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>調査結果</CardTitle>
          <div className="flex space-x-2">
            <Button 
              onClick={handleDownload}
              variant="outline"
              size="sm"
            >
              レポートをダウンロード
            </Button>
            <Button 
              onClick={handleNewSearch}
              variant="outline" 
              size="sm"
            >
              新しい調査
            </Button>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm md:prose-base dark:prose-invert max-w-none pt-0">
          <ReactMarkdown>{report}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
} 