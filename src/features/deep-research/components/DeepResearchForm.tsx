import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { ClientResearchParams } from '@/lib/deep-research';
import { ClientResearchParamsSchema } from '@/lib/deep-research';
import { getSupportedModels } from '@/lib/llm/factory';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface DeepResearchFormProps {
  onSubmit: (data: ClientResearchParams) => Promise<void>;
  isResearching: boolean;
}

// 利用可能なモデルのリスト
const AVAILABLE_MODELS = getSupportedModels();

export const DeepResearchForm = ({ onSubmit, isResearching }: DeepResearchFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientResearchParams>({
    resolver: zodResolver(ClientResearchParamsSchema),
    defaultValues: {
      depth: 2,
      breadth: 4,
      model: 'gpt-4o',
    },
  });

  const depth = watch('depth');
  const breadth = watch('breadth');
  const selectedModel = watch('model');
  const selectedProvider = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.provider || '';

  const handleDepthChange = (value: number[]) => {
    setValue('depth', value[0]);
  };

  const handleBreadthChange = (value: number[]) => {
    setValue('breadth', value[0]);
  };

  const handleModelChange = (value: string) => {
    setValue('model', value);
  };

  // フォーム送信処理
  const handleFormSubmit = async (data: ClientResearchParams) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ディープリサーチ</CardTitle>
          <CardDescription>
            リサーチしたいトピックを入力してください。AIがディープリサーチを実行します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">リサーチクエリ</Label>
            <Input
              id="query"
              placeholder="調査したいトピックを入力してください"
              {...register('query')}
              disabled={isResearching}
            />
            {errors.query && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{errors.query.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>調査の深さ: {depth}</Label>
              <div className="px-2">
                <Slider
                  defaultValue={[depth]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={handleDepthChange}
                  disabled={isResearching}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>浅い</span>
                  <span>深い</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>調査の広さ: {breadth}</Label>
              <div className="px-2">
                <Slider
                  defaultValue={[breadth]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={handleBreadthChange}
                  disabled={isResearching}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>狭い</span>
                  <span>広い</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">言語モデル</Label>
            <Select 
              value={selectedModel} 
              onValueChange={handleModelChange}
              disabled={isResearching}
            >
              <SelectTrigger>
                <SelectValue placeholder="モデルを選択" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isResearching}>
            {isResearching ? 'リサーチ実行中...' : 'リサーチを開始'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}; 