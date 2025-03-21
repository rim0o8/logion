import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progressSteps: string[];
}

export function ProgressIndicator({ progressSteps }: ProgressIndicatorProps) {
  return (
    <Card className="max-w-2xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>調査の進捗状況</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={Math.min(progressSteps.length * 20, 95)} className="mb-4" />
        <ul className="space-y-2">
          {progressSteps.map((step, index) => (
            <li key={`step-${index}-${step.substring(0, 10)}`} className="flex items-center">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 