import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FC } from 'react';

interface ResearchProgressProps {
  progress: number;
  message: string;
  onCancel: () => void;
}

export const ResearchProgress: FC<ResearchProgressProps> = ({
  progress,
  message,
  onCancel,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Research in Progress</CardTitle>
        <CardDescription>
          AI is conducting research. Please wait a moment.
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
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 