import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_MODELS, MODEL_PROVIDERS } from "@/config/llm";
import { ChevronDown } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const selectedModelInfo = AVAILABLE_MODELS.find(model => model.id === selectedModel);
  const isClaudeModel = (MODEL_PROVIDERS.CLAUDE as readonly string[]).includes(selectedModel);
  const isDeepSeekModel = (MODEL_PROVIDERS.DEEPSEEK as readonly string[]).includes(selectedModel);

  // モデルプロバイダーに基づいて色を決定
  const getModelColor = (modelId: string) => {
    if ((MODEL_PROVIDERS.CLAUDE as readonly string[]).includes(modelId)) return 'bg-purple-500';
    if ((MODEL_PROVIDERS.DEEPSEEK as readonly string[]).includes(modelId)) return 'bg-blue-500';
    return 'bg-green-500'; // OpenAIのデフォルト色
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-9 px-3 py-1 text-sm sm:h-10 sm:px-4 sm:py-2 touch-manipulation"
          aria-label="モデルを選択"
        >
          <span className={`h-2 w-2 rounded-full ${getModelColor(selectedModel)}`} />
          <span className="truncate max-w-[120px] sm:max-w-[180px]">{selectedModelInfo?.name || selectedModel}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[280px] sm:w-[320px] max-h-[60vh] overflow-y-auto"
      >
        {AVAILABLE_MODELS.map((model) => {
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className="flex items-start gap-2 py-2 px-3 cursor-pointer touch-manipulation"
            >
              <span className={`h-2 w-2 rounded-full ${getModelColor(model.id)} mt-1.5 flex-shrink-0`} />
              <div>
                <div className="font-medium text-sm">{model.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{model.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 