import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/storage";
import { deleteConversation, getConversations } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ConversationListProps {
  closeMenu?: () => void;
}

export function ConversationList({ closeMenu }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  // 会話リストを取得
  useEffect(() => {
    const loadConversations = () => {
      const convs = getConversations();
      // 日付の新しい順にソート
      convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(convs);
    };

    loadConversations();

    // ローカルストレージの変更を監視
    const handleStorageChange = () => {
      loadConversations();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 新しい会話を開始
  const handleNewConversation = () => {
    router.push('/chat');
    if (closeMenu) closeMenu();
  };

  // 会話を削除
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('この会話を削除してもよろしいですか？')) {
      deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
    }
  };

  return (
    <div className="px-2 py-2">
      <div className="mb-4">
        <Button 
          onClick={handleNewConversation}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          新しい会話
        </Button>
      </div>

      <div className="space-y-1">
        <h3 className="px-3 text-xs font-medium text-muted-foreground">会話履歴</h3>
        
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
                className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
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
                    className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
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