import type { Message } from "./llm/types";

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
  
  const existingIndex = conversationsCache.findIndex(c => c.id === conversation.id);
  
  if (existingIndex >= 0) {
    // 既存の会話を更新
    conversationsCache[existingIndex] = {
      ...conversation,
      updatedAt: new Date().toISOString()
    };
  } else {
    // 新しい会話を追加
    conversationsCache.push({
      ...conversation,
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
  
  const content = firstUserMessage.content.trim();
  if (content.length <= 30) return content;
  
  return `${content.substring(0, 30)}...`;
} 