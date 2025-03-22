import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/storage";
import { deleteConversation, getConversations } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { FileText, Home, Info, MessageSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ConversationListProps {
  closeMenu?: () => void;
}

export function ConversationList({ closeMenu }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // 会話リストを取得する関数をメモ化
  const loadConversations = useCallback(() => {
    const convs = getConversations();
    // 日付の新しい順にソート
    convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setConversations(convs);
  }, []);

  // 会話リストを取得
  useEffect(() => {
    loadConversations();

    // ローカルストレージの変更を監視（イベントスロットリングを実装）
    let timeoutId: NodeJS.Timeout | null = null;
    const handleStorageChange = (e: StorageEvent) => {
      // 関連するキーの変更のみ処理
      if (e.key === 'chat-conversations' || e.key === null) {
        // 短時間に複数の更新があった場合、最後の更新のみ処理
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          loadConversations();
          timeoutId = null;
        }, 300);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadConversations]);

  // 新しい会話を開始
  const handleNewConversation = () => {
    router.push('/chat');
    if (closeMenu) closeMenu();
  };

  // 会話を削除
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    deleteConversation(id);
    // ローカルステートを直接更新して再レンダリングを最適化
    setConversations(prev => prev.filter(c => c.id !== id));
    
    // 現在のページが削除された会話のページである場合、新しいチャットページにリダイレクト
    if (pathname === `/chat/${id}`) {
      router.push('/chat');
    }
  };

  // ナビゲーション処理
  const handleNavigation = (path: string) => {
    if (path === '/') {
      router.push('/');
    } else if (path === '/chat') {
      router.push('/chat');
    } else if (path === '/about') {
      router.push('/about');
    } else if (path === '/deep-research') {
      router.push('/deep-research');
    } else {
      // 他のパスは未実装
      alert('このページは準備中です');
      return;
    }

    if (closeMenu) closeMenu();
  };

  return (
    <div className="px-2 py-2">
      <div className="space-y-1 mb-6">
        <Button
          variant={pathname === '/' ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => handleNavigation('/')}
        >
          <Home className="h-4 w-4" />
          ホーム
        </Button>

        {/* Deep Research - 区切り線とスペースを追加して目立たせる */}
        <div className="my-3 border-t pt-3">
          <Button
            variant={pathname === '/deep-research' ? "secondary" : "default"}
            className="w-full justify-start gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all py-5"
            onClick={() => handleNavigation('/deep-research')}
          >
            <FileText className="h-5 w-5" />
            <span className="font-semibold">ディープリサーチ</span>
          </Button>
        </div>

        <div className="my-2 border-t pt-2">
          <Button
            variant={pathname === '/chat' && !pathname.includes('/chat/') ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => handleNavigation('/chat')}
          >
            <MessageSquare className="h-4 w-4" />
            新しい会話
          </Button>
        </div>

        <Button
          variant={pathname === '/about' ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => handleNavigation('/about')}
        >
          <Info className="h-4 w-4" />
          このアプリについて
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-xs font-medium text-muted-foreground">会話履歴</h3>
          <Button 
            onClick={handleNewConversation}
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {conversations.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground py-2">
            会話履歴はありません
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                onClick={closeMenu}
                className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{conversation.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.updatedAt), { 
                      addSuffix: true,
                      locale: ja
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 