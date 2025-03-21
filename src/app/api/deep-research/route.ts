import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5分のタイムアウト

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "トピックは必須で、文字列である必要があります" },
        { status: 400 }
      );
    }

    // ストリーミングレスポンスを設定
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // バックグラウンドで実行
    const responsePromise = NextResponse.json(
      { 
        success: true,
        message: "ストリーミングレポートを開始しました。"
      }
    );

    // 進捗更新関数
    const updateProgress = async (message: string) => {
      const data = {
        type: "progress",
        message
      };
      await writer.write(encoder.encode(`${JSON.stringify(data)}\n`));
    };

    // 設定オブジェクトを作成
    const config = {
      configurable: {
        // 必要に応じて設定をカスタマイズ
        maxSearchDepth: 2,
        numberOfQueries: 3,
        writerModel: "claude-3-5-sonnet-latest",
        writerProvider: "anthropic",
        plannerModel: "claude-3-5-sonnet-latest",
        plannerProvider: "anthropic",
        searchApi: "tavily",
        progressCallback: updateProgress
      },
    };

    // レポート生成プロセスを開始
    console.log(`Deep Researchレポートの生成を開始: "${topic}"`);
    
    // レポート生成処理を非同期で実行
    (async () => {
      try {
        await updateProgress("リサーチプランを作成中...");
        
        /*
        // デバッグ用に直接レポートを返す
        const mockReport = `
# ${topic}に関する調査レポート

## 1. 概要

${topic}は現代社会において重要な技術分野として注目されています。様々な業界での応用が進み、社会や経済に大きな変革をもたらしています。

## 2. 主な応用分野

### 2.1 医療分野

${topic}は医療分野において診断支援、治療計画の最適化、医療画像の分析などに活用されています。特に画像認識技術を用いたレントゲンやMRI画像の分析では、医師の診断精度向上に貢献しています。

### 2.2 金融分野

金融業界では、${topic}を活用した詐欺検出、リスク評価、自動取引、個人向け金融アドバイスなどのサービスが提供されています。これにより、金融サービスのアクセシビリティと効率性が向上しています。

### 2.3 製造業

製造業では、予知保全、品質管理、生産最適化などに${topic}が導入されています。センサーデータの分析により設備故障を予測し、ダウンタイムを最小化する取り組みが進んでいます。

## 3. 今後の展望と課題

${topic}の技術発展に伴い、今後さらに多くの分野での応用が期待されています。一方で、データプライバシー、倫理的問題、技術格差などの課題も存在します。これらの課題に対処しながら、${topic}の恩恵を社会全体で享受できる環境づくりが求められています。

## 4. まとめ

${topic}は私たちの生活や仕事を大きく変革する可能性を秘めています。様々な業界での応用事例が増え、その効果が実証されるにつれて、今後さらなる発展と普及が見込まれます。
`;
        
        // レポート生成のモック処理
        await new Promise(resolve => setTimeout(resolve, 2000));
        await updateProgress("レポートの生成が完了しました");
        
        // レポート完了を通知
        const completionData = {
          type: "complete",
          report: mockReport
        };
        await writer.write(encoder.encode(`${JSON.stringify(completionData)}\n`));
        */
        
        // 実際のレポート生成処理
        console.log(`executeReport関数を呼び出し中... トピック: "${topic}"`);
        console.log("設定パラメータ:", JSON.stringify({
          ...config.configurable,
          writerModel: config.configurable.writerModel,
          plannerModel: config.configurable.plannerModel,
          // コールバック関数はJSONシリアライズできないため除外
          progressCallback: "function(message){...}"
        }, null, 2));
        
        // ここでReportモジュールをインポート
        const { executeReport } = await import("@/lib/deep-research");
        
        await updateProgress("レポート生成を開始します...");
        const report = await executeReport(topic, config);
        console.log(`レポート生成完了. 文字数: ${report.length}`);
        
        // レポート完了を通知
        const completionData = {
          type: "complete",
          report
        };
        await writer.write(encoder.encode(`${JSON.stringify(completionData)}\n`));
      } catch (error) {
        console.error("Deep Researchエラー:", error);
        // エラー通知
        const errorData = {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error"
        };
        await writer.write(encoder.encode(`${JSON.stringify(errorData)}\n`));
      } finally {
        await writer.close();
      }
    })();

    // ストリーミングレスポンスを返す
    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("APIエラー:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "レポート処理の開始中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 