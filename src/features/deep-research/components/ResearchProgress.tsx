import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import React from 'react';

interface ResearchProgressProps {
  progress: number;
  message: string;
  onCancel: () => void;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({
  progress,
  message,
  onCancel,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>リサーチ進行中</CardTitle>
        <CardDescription>
          AIがリサーチを実行しています。しばらくお待ちください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{message}</span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 