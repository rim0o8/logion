"use client";

import {
    ErrorDisplay,
    ProgressIndicator,
    ResearchForm,
    ResearchReport
} from "@/components/deep-research";
import { useEffect, useRef, useState } from "react";

export default function DeepResearchPage() {
  const [topic, setTopic] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  // コンポーネントがアンマウントされたときにストリームをクリーンアップ
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel().catch(console.error);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setReport("");
    setProgressSteps([]);
    addProgressStep("リクエストを送信中...");

    try {
      const response = await fetch("/api/deep-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok || !response.body) {
        throw new Error("サーバーからのレスポンスが無効です");
      }

      // レスポンスボディからリーダーを取得
      const reader = response.body.getReader();
      readerRef.current = reader;

      // 読み取りループ
      const processStream = async () => {
        let receivedData = "";

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log("Stream complete");
            break;
          }

          // 受信したデータをデコード
          const chunk = new TextDecoder().decode(value);
          receivedData += chunk;
          
          console.log("受信データチャンク:", chunk.substring(0, 100) + "...");

          // 改行で区切られたJSONオブジェクトを処理
          const lines = receivedData.split('\n');
          // 最後の不完全な行を保持
          receivedData = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const data = JSON.parse(line);
              console.log("処理中のデータ:", data.type);
              
              // メッセージタイプによって処理を分岐
              switch (data.type) {
                case 'progress':
                  addProgressStep(data.message);
                  break;
                case 'complete':
                  if (data.report && data.report.trim()) {
                    setReport(data.report);
                    addProgressStep("レポートの生成が完了しました");
                  } else {
                    setError("レポートを生成できませんでした。別のトピックで試してください。");
                    addProgressStep("レポート生成に失敗しました");
                  }
                  setLoading(false);
                  break;
                case 'error':
                  throw new Error(data.error || "処理中にエラーが発生しました");
                default:
                  console.warn("未知のメッセージタイプ:", data.type);
              }
            } catch (err) {
              console.error("JSON解析エラー:", err, line);
              setError(err instanceof Error ? err.message : "データの解析中にエラーが発生しました");
              setLoading(false);
              return;
            }
          }
        }
      };

      // ストリーム処理を開始
      processStream().catch(err => {
        console.error("ストリーム処理エラー:", err);
        setError(err instanceof Error ? err.message : "ストリーム処理中にエラーが発生しました");
        setLoading(false);
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
      addProgressStep("エラーが発生しました");
      setLoading(false);
    }
  };

  const addProgressStep = (step: string) => {
    setProgressSteps(prev => [...prev, step]);
  };

  const handleNewSearch = () => {
    // 現在のストリームがあればキャンセル
    if (readerRef.current) {
      readerRef.current.cancel().catch(console.error);
      readerRef.current = null;
    }
    
    setReport("");
    setError("");
    setProgressSteps([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">AIディープリサーチ</h1>

      {!report && (
        <ResearchForm
          topic={topic}
          setTopic={setTopic}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      )}

      {loading && <ProgressIndicator progressSteps={progressSteps} />}

      {error && (
        <ErrorDisplay
          error={error}
          handleNewSearch={handleNewSearch}
        />
      )}

      {report && (
        <ResearchReport
          report={report}
          handleNewSearch={handleNewSearch}
        />
      )}
    </div>
  );
} 