import { Config } from '@/utils/config';
import type { Session } from 'next-auth';
import { useEffect, useState } from 'react';
import type { Workflow } from './index';
export const useFetchWorkflows = (session: Session | null, status: string) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      if (status !== 'authenticated') return;

      const apiUrl = `${Config.NEXT_PUBLIC_API_URL}/workflows`;

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.idToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('ワークフローの取得に失敗しました');
        }

        const data = await response.json();
        setWorkflows(data);
        setError(null);
      } catch (error) {
        console.error('ワークフロー一覧取得エラー:', error);
        setError('ワークフローの取得中にエラーが発生しました');
      }
    };
    fetchWorkflows();
  }, [session, status]);

  return { workflows, error };
};
