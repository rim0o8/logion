import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import type { InputSchema } from './types';

interface InputFieldProps {
  field: InputSchema;
  value: string | string[] | File;
  onChange: (name: string, value: string | string[] | File) => void;
  onListItemChange?: (name: string, index: number, value: string) => void;
  onAddListItem?: (name: string) => void;
  onRemoveListItem?: (name: string, index: number) => void;
}

export const InputField: React.FC<InputFieldProps> = ({
  field,
  value,
  onChange,
  onListItemChange,
  onAddListItem,
  onRemoveListItem,
}) => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>読み込み中...</div>;
  }

  if (status === "unauthenticated") {
    return <div>認証が必要です</div>;
  }

  if (field.type === 'list[text]' || field.type === 'list[textarea]') {
    const values = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={`${field.name}-${index}`} className="flex gap-2">
            {field.type === 'list[textarea]' ? (
              <Textarea
                id={`${field.name}-${index}`}
                value={item}
                onChange={(e) => onListItemChange?.(field.name, index, e.target.value)}
              />
            ) : (
              <Input
                id={`${field.name}-${index}`}
                value={item}
                onChange={(e) => onListItemChange?.(field.name, index, e.target.value)}
              />
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onRemoveListItem?.(field.name, index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onAddListItem?.(field.name)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          追加
        </Button>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.name}
        value={value as string}
        onChange={(e) => onChange(field.name, e.target.value)}
      />
    );
  }
  if (field.type === 'textfile') {
    return (
      <div className="flex flex-col gap-2">
        <Input
          id={field.name}
          type="file"
          accept=".txt,.TXT,.md,.MD,.markdown,.MARKDOWN,.pdf,.PDF,.html,.HTML,.xlsx,.XLSX,.xls,.XLS,.docx,.DOCX,.csv,.CSV,.eml,.EML,.msg,.MSG,.pptx,.PPTX,.ppt,.PPT,.xml,.XML,.epub,.EPUB"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !session?.idToken) return;
            onChange(field.name, file);
          }}
          className="cursor-pointer"
        />
        {value && (
          <div className="text-sm text-slate-400">
            ファイルの内容を読み込みました
          </div>
        )}
      </div>
    );
  }
  if (field.type === 'choice' || field.type === 'list[choice]') {
    if (field.type === 'list[choice]') {
      const values = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {values.map((item, index) => (
            <div key={`${field.name}-${index}-${item}`} className="flex gap-2">
              <Select
                value={item}
                onValueChange={(value) => onListItemChange?.(field.name, index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onRemoveListItem?.(field.name, index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => onAddListItem?.(field.name)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            追加
          </Button>
        </div>
      );
    }

    return (
      <Select
        value={value as string}
        onValueChange={(value) => onChange(field.name, value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      id={field.name}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value as string}
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  );
};