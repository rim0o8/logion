import type { Message } from "./llm/types";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ローカルストレージのキー
const CONVERSATIONS_KEY = 'chat-conversations';

// 会話リストを取得
export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('会話履歴の解析に失敗しました:', error);
    return [];
  }
}

// 会話を保存
export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return;
  
  const conversations = getConversations();
  const existingIndex = conversations.findIndex(c => c.id === conversation.id);
  
  if (existingIndex >= 0) {
    // 既存の会話を更新
    conversations[existingIndex] = {
      ...conversation,
      updatedAt: new Date().toISOString()
    };
  } else {
    // 新しい会話を追加
    conversations.push({
      ...conversation,
      createdAt: conversation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

// 会話を削除
export function deleteConversation(id: string): void {
  if (typeof window === 'undefined') return;
  
  const conversations = getConversations();
  const filtered = conversations.filter(c => c.id !== id);
  
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
}

// 会話を取得
export function getConversation(id: string): Conversation | null {
  const conversations = getConversations();
  return conversations.find(c => c.id === id) || null;
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