import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export interface ResearchParams {
  topic: string;
  writerModel: string;
  plannerModel: string;
  maxSearchDepth: number;
  numberOfQueries: number;
}

interface ResearchFormProps {
  topic: string;
  setTopic: (topic: string) => void;
  handleSubmit: (e: React.FormEvent, params: ResearchParams) => Promise<void>;
  loading: boolean;
}

export function ResearchForm({ topic, setTopic, handleSubmit, loading }: ResearchFormProps) {
  // フォームの状態を管理
  const [writerModel, setWriterModel] = useState("claude-3-5-sonnet-latest");
  const [plannerModel, setPlannerModel] = useState("claude-3-7-sonnet-latest");
  const [maxSearchDepth, setMaxSearchDepth] = useState(2);
  const [numberOfQueries, setNumberOfQueries] = useState(3);
  
  // 利用可能なモデルのリスト
  const availableModels = [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet" },
    { id: "gpt-4o", name: "GPT-4o (未対応)" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (未対応)" }
  ];

  // フォーム送信時に全パラメータを渡す
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: ResearchParams = {
      topic,
      writerModel,
      plannerModel,
      maxSearchDepth,
      numberOfQueries
    };
    handleSubmit(e, params);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>新しいリサーチを開始</CardTitle>
        <CardDescription>調査したいトピックを入力してください。AIが包括的な調査を行います。</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="topic">調査トピック</Label>
              <Textarea
                id="topic"
                placeholder="調査トピックを入力..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                className="min-h-20"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="writer-model">執筆モデル</Label>
                <Select
                  value={writerModel}
                  onValueChange={setWriterModel}
                  disabled={loading}
                >
                  <SelectTrigger id="writer-model">
                    <SelectValue placeholder="執筆モデルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="planner-model">プランナーモデル</Label>
                <Select
                  value={plannerModel}
                  onValueChange={setPlannerModel}
                  disabled={loading}
                >
                  <SelectTrigger id="planner-model">
                    <SelectValue placeholder="プランナーモデルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-depth">検索深度</Label>
                <Select
                  value={maxSearchDepth.toString()}
                  onValueChange={(value) => setMaxSearchDepth(Number(value))}
                  disabled={loading}
                >
                  <SelectTrigger id="max-depth">
                    <SelectValue placeholder="検索深度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1回 (最小)</SelectItem>
                    <SelectItem value="2">2回 (推奨)</SelectItem>
                    <SelectItem value="3">3回 (詳細)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="num-queries">検索クエリ数</Label>
                <Select
                  value={numberOfQueries.toString()}
                  onValueChange={(value) => setNumberOfQueries(Number(value))}
                  disabled={loading}
                >
                  <SelectTrigger id="num-queries">
                    <SelectValue placeholder="クエリ数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1個 (最小)</SelectItem>
                    <SelectItem value="3">3個 (推奨)</SelectItem>
                    <SelectItem value="5">5個 (詳細)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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