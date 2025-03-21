import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorDisplayProps {
  error: string;
  handleNewSearch: () => void;
}

export function ErrorDisplay({ error, handleNewSearch }: ErrorDisplayProps) {
  return (
    <Card className="max-w-2xl mx-auto mt-6 border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700">エラーが発生しました</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-700">{error}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleNewSearch} variant="outline">
          新しい調査を開始
        </Button>
      </CardFooter>
    </Card>
  );
} 