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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isClaudeModel ? 'bg-purple-500' : 'bg-green-500'}`} />
          <span>{selectedModelInfo?.name || selectedModel}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {AVAILABLE_MODELS.map((model) => {
          const isClaudeModel = (MODEL_PROVIDERS.CLAUDE as readonly string[]).includes(model.id);
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className="flex items-center gap-2"
            >
              <span className={`h-2 w-2 rounded-full ${isClaudeModel ? 'bg-purple-500' : 'bg-green-500'}`} />
              <div>
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-muted-foreground">{model.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 