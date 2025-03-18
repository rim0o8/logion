import type { Message, MessageContent, MessageContentItem } from "./llm/types";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model?: string; // 使用しているモデル
  createdAt: string;
  updatedAt: string;
}

// ローカルストレージのキー
const CONVERSATIONS_KEY = 'chat-conversations';

// キャッシュ
let conversationsCache: Conversation[] | null = null;

/**
 * 画像データが含まれるメッセージを処理し、画像データをURLに置き換える
 * @param message 処理するメッセージ
 * @returns 処理済みのメッセージ（画像のbase64データをURLに置き換え済み）
 */
export function processMessageForStorage(message: Message): Message {
  // コンテンツが配列の場合に処理
  if (Array.isArray(message.content)) {
    // 画像URLのみを保持し、base64データを除外した新しいコンテンツを作成
    const processedContent = message.content.map((item: MessageContentItem) => {
      if (item.type === 'image_url' && item.image_url) {
        // 既にURLで、base64データでない場合はそのまま返す
        if (item.image_url.url && !item.image_url.url.startsWith('data:image/')) {
          return item;
        }
        
        // base64データの場合は、サイズ削減のためにURLのみを保持するオブジェクトを返す
        return {
          type: 'image_url' as const,
          image_url: {
            url: `${item.image_url.url.substring(0, 50)}...[image data truncated]`
          }
        };
      }
      return item;
    }) as MessageContent;
    
    return {
      ...message,
      content: processedContent
    };
  }
  
  return message;
}

// 会話リストを取得
export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  
  // キャッシュがあればそれを返す
  if (conversationsCache !== null) {
    return [...conversationsCache]; // 配列のコピーを返す
  }
  
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    conversationsCache = parsed; // キャッシュを更新
    return [...parsed]; // 配列のコピーを返す
  } catch (error) {
    console.error('会話履歴の解析に失敗しました:', error);
    return [];
  }
}

// 会話を保存
export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return;
  
  // キャッシュがなければ初期化
  if (conversationsCache === null) {
    conversationsCache = getConversations();
  }
  
  // 会話内のメッセージを処理（画像データを最適化）
  const processedMessages = conversation.messages.map(processMessageForStorage);
  const processedConversation = {
    ...conversation,
    messages: processedMessages
  };
  
  const existingIndex = conversationsCache.findIndex(c => c.id === conversation.id);
  
  if (existingIndex >= 0) {
    // 既存の会話を更新
    conversationsCache[existingIndex] = {
      ...processedConversation,
      updatedAt: new Date().toISOString()
    };
  } else {
    // 新しい会話を追加
    conversationsCache.push({
      ...processedConversation,
      createdAt: conversation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // ローカルストレージに保存
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversationsCache));
  
  // ストレージイベントを手動でディスパッチ（同一ウィンドウ内の他のコンポーネントに通知）
  window.dispatchEvent(new StorageEvent('storage', {
    key: CONVERSATIONS_KEY,
    newValue: JSON.stringify(conversationsCache)
  }));
}

// 会話を削除
export function deleteConversation(id: string): void {
  if (typeof window === 'undefined') return;
  
  // キャッシュがなければ初期化
  if (conversationsCache === null) {
    conversationsCache = getConversations();
  }
  
  // キャッシュから削除
  conversationsCache = conversationsCache.filter(c => c.id !== id);
  
  // ローカルストレージに保存
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversationsCache));
  
  // ストレージイベントを手動でディスパッチ
  window.dispatchEvent(new StorageEvent('storage', {
    key: CONVERSATIONS_KEY,
    newValue: JSON.stringify(conversationsCache)
  }));
}

// 会話を取得
export function getConversation(id: string): Conversation | null {
  // キャッシュがなければ初期化
  if (conversationsCache === null) {
    conversationsCache = getConversations();
  }
  
  return conversationsCache.find(c => c.id === id) || null;
}

// 新しい会話IDを生成
export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 会話のタイトルを自動生成（最初のユーザーメッセージから）
export function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return '新しい会話';
  
  // 文字列形式のコンテンツの場合
  if (typeof firstUserMessage.content === 'string') {
    const content = firstUserMessage.content.trim();
    if (content.length <= 30) return content;
    return `${content.substring(0, 30)}...`;
  }
  
  // 配列形式のコンテンツの場合（マルチモーダル）
  if (Array.isArray(firstUserMessage.content)) {
    // テキスト要素を探す
    const textItem = firstUserMessage.content.find(item => item.type === 'text' && item.text);
    if (textItem && textItem.type === 'text' && textItem.text) {
      const content = textItem.text.trim();
      if (content.length <= 30) return content;
      return `${content.substring(0, 30)}...`;
    }
    
    // 画像要素があるか確認
    const hasImage = firstUserMessage.content.some(item => item.type === 'image_url');
    if (hasImage) {
      return '画像を含む会話';
    }
  }
  
  return '新しい会話';
} 