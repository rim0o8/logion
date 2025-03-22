import type { Section } from "./state";

/**
 * JSONテキストを安全に解析するユーティリティ関数
 * 改良版: JSONの厳密な構文解析ではなく、必要なデータを抽出する方法を採用
 * 
 * @param contentStr - 解析するJSON文字列またはプレーンテキスト
 * @param defaultValue - 解析に失敗した場合のデフォルト値
 * @returns 解析されたオブジェクトまたはデフォルト値
 */
export function safeJsonParse<T>(contentStr: string, defaultValue: T): T {
  try {
    // 最初にテキストが空かどうかチェック
    if (!contentStr || contentStr.trim() === '') {
      console.log("[DEBUG] 空の入力文字列です。デフォルト値を使用します。");
      return defaultValue;
    }

    // まず通常のJSON.parseを試みる（最も簡単なケース）
    try {
      return JSON.parse(contentStr) as T;
    } catch (initialError) {
      // JSON.parseに失敗した場合、開始位置と終了位置を探して部分文字列を抽出
      console.log("[DEBUG] 標準JSON.parseに失敗しました。代替処理を開始します。");
    }

    // JSON形式の内容かどうかを確認
    const isJsonLike = contentStr.includes('{') && contentStr.includes('}');
    const isArrayLike = contentStr.includes('[') && contentStr.includes(']');
    
    if (!isJsonLike && !isArrayLike) {
      // JSONのような構造がない場合はプレーンテキストとして処理
      console.log("[DEBUG] JSON構造が見つかりません。プレーンテキストとして扱います。");
      
      // デフォルト値がオブジェクトの場合は、その最初のプロパティに値を設定
      if (defaultValue && typeof defaultValue === 'object') {
        const firstKey = Object.keys(defaultValue)[0];
        if (firstKey) {
          // デフォルト値をクローンして最初のキーに値を設定
          const result = { ...defaultValue } as any;
          result[firstKey] = contentStr;
          return result as T;
        }
      }
      return defaultValue;
    }
    
    // contentフィールドの値を正規表現で抽出（最もよくある形式）
    if (isJsonLike) {
      const contentMatch = contentStr.match(/"content"\s*:\s*"((?:\\"|[^"])*?)"/);
      if (contentMatch && contentMatch[1]) {
        const content = contentMatch[1].replace(/\\"/g, '"');
        
        // デフォルト値のオブジェクトに抽出した値を設定
        if (defaultValue && typeof defaultValue === 'object') {
          const result = { ...defaultValue } as any;
          // 'content'フィールドがある場合はそれを使用
          if ('content' in result) {
            result.content = content;
            return result as T;
          }
        }
      }
    }
    
    // セクション配列を抽出する（計画生成など用）
    if (defaultValue && typeof defaultValue === 'object' && 'sections' in defaultValue) {
      // 簡易的な配列抽出のための正規表現
      const sectionsMatch = contentStr.match(/\[\s*{([^[\]{}]|{[^{}]*})*}\s*\]/);
      if (sectionsMatch && sectionsMatch[0]) {
        try {
          const sectionsArray = JSON.parse(sectionsMatch[0]);
          const result = { ...defaultValue } as any;
          result.sections = sectionsArray;
          return result as T;
        } catch (e) {
          console.log("[DEBUG] セクション配列の抽出に失敗しました。", e);
        }
      }
    }

    // 最後の手段としてオブジェクト化を試みる
    if (isJsonLike) {
      const cleanedStr = contentStr
        .replace(/[\r\n]/g, ' ')  // 改行を削除
        .replace(/\\/g, '\\\\')   // バックスラッシュをエスケープ
        .replace(/([^\\])"/g, '$1\\"'); // エスケープされていない引用符をエスケープ
        
      try {
        const jsonObj = JSON.parse(`{"text":"${cleanedStr}"}`);
        
        // デフォルト値のオブジェクトに抽出した値を設定
        if (defaultValue && typeof defaultValue === 'object') {
          const result = { ...defaultValue } as any;
          const firstKey = Object.keys(result)[0];
          if (firstKey) {
            result[firstKey] = jsonObj.text;
            return result as T;
          }
        }
      } catch (e) {
        console.log("[DEBUG] 最終手段のJSON変換にも失敗しました。デフォルト値を使用します。");
      }
    }
    
    // どの方法も失敗した場合はデフォルト値を返す
    return defaultValue;
  } catch (error) {
    console.error("[ERROR] JSON解析中に予期しないエラー:", error);
    return defaultValue;
  }
}

/**
 * セクションからセクション名を抽出するための正規表現処理
 */
export function extractSectionsFromText(text: string, topic: string): Section[] {
  console.log("[DEBUG] テキストからセクションを抽出しています...");
  
  // セクションのヘッダーを検出するための正規表現
  const sectionHeaderRegex = /(?:^|\n)#+\s+(.+?)(?:\n|$)/g;
  const sections: Section[] = [];
  
  let match;
  
  // eslint-disable-next-line no-cond-assign
  while ((match = sectionHeaderRegex.exec(text)) !== null) {
    const sectionName = match[1].trim();
    // セクション名が有効な場合のみ追加
    if (sectionName && !sectionName.includes('概要') && !sectionName.includes('まとめ') && sectionName.length < 100) {
      sections.push({
        name: sectionName,
        description: `${topic}の${sectionName}について`,
        research: true,
        content: ""
      });
    }
  }
  
  // セクションが見つからなかった場合はデフォルトのセクションを返す
  if (sections.length === 0) {
    return [{
      name: "概要",
      description: `${topic}の概要`,
      research: true,
      content: ""
    }];
  }
  
  return sections;
}

/**
 * 文字列からコンテンツフィールドを抽出する関数
 * 
 * @param content - 入力テキスト
 * @returns 抽出されたコンテンツまたは入力テキストそのもの
 */
export function extractContentField(content: string): string {
  if (!content) return "";
  
  // JSONのようなフォーマットかどうかをチェック
  const isJsonLike = content.includes('{') && content.includes('}');
  
  if (!isJsonLike) {
    // JSONでなければそのまま返す
    return content;
  }
  
  try {
    // contentフィールドを持つJSONを解析する試み
    const parsed = safeJsonParse<{content?: string}>(content, {content: undefined});
    
    if (parsed.content) {
      return parsed.content;
    }
    
    // 直接JSON解析に失敗した場合、正規表現を使用
    const contentMatch = content.match(/"content"\s*:\s*"((?:\\"|[^"])*?)"/);
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1].replace(/\\"/g, '"');
    }
    
    // マークダウン形式の場合の処理
    if (content.includes('#')) {
      // マークダウンとして処理するべきか判断
      const lines = content.split('\n');
      const hasHeader = lines.some(line => /^#+\s/.test(line));
      
      if (hasHeader) {
        return content;
      }
    }
    
    // どの方法でも抽出できなかった場合は元の文字列を返す
    return content;
  } catch (error) {
    // エラーが発生した場合は元のテキストを返す
    console.error("[ERROR] コンテンツ抽出中にエラーが発生:", error);
    return content;
  }
}

/**
 * セクションをマークダウン形式でフォーマットする
 */
export function formatCompletedSections(sections: Section[]): string {
  return sections.map(s => `# ${s.name}\n\n${s.content}`).join("\n\n");
} 