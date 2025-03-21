import type { LLMProvider, Message } from '@/lib/llm/types';
import { useState } from 'react';

interface UseChatStateOptions {
  llmProvider: LLMProvider;
  initialMessages?: Message[];
  onError?: (error: Error) => void;
}

export function useChatState({
  llmProvider,
  initialMessages = [],
  onError,
}: UseChatStateOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (content: string) => {
    const userMessage: Message = {
      role: 'user',
      content,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    llmProvider
      .sendMessage([...messages, userMessage])
      .then(response => {
        setMessages(prev => [...prev, response]);
      })
      .catch(error => {
        onError?.(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    addMessage,
    clearMessages,
  };
} 