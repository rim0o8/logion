import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ResearchFormProps {
  topic: string;
  setTopic: (topic: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function ResearchForm({ topic, setTopic, handleSubmit, loading }: ResearchFormProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>新しいリサーチを開始</CardTitle>
        <CardDescription>調査したいトピックを入力してください。AIが包括的な調査を行います。</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                id="topic"
                placeholder="調査トピックを入力..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                調査中...
              </>
            ) : "調査を開始"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 