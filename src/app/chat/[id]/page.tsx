'use client';

import ChatContent from '@/components/chat/ChatContent';
import { SessionProvider } from "next-auth/react";

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <SessionProvider>
      <div className="container mx-auto py-8">
        <ChatContent conversationId={params.id} />
      </div>
    </SessionProvider>
  );
} 