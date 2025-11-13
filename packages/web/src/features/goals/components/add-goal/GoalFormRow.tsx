import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GoalFormRowProps {
  id: string;
  index: number;
  name: string;
  content: string;
  weight: number;
  disableRemove: boolean;
  onNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onWeightChange: (value: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function GoalFormRow({
  id,
  index,
  name,
  content,
  weight,
  disableRemove,
  onNameChange,
  onContentChange,
  onWeightChange,
  onRemove,
  disabled = false,
}: Readonly<GoalFormRowProps>) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <input
          type="text"
          placeholder={`目標${index + 1}`}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={disabled}
          className="flex-1 text-xl font-semibold border-none bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground/50"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disableRemove || disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive-foreground shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`goal-content-${id}`}>内容</Label>
          <Textarea
            id={`goal-content-${id}`}
            placeholder="目標の詳細な内容を入力してください"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={4}
            disabled={disabled}
            className="h-[25vh] max-h-[50vh] sm:h-16 text-xs sm:text-sm sm:resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`goal-weight-${id}`}>ウェイト (%)</Label>
          <Input
            id={`goal-weight-${id}`}
            type="number"
            min="0"
            max="100"
            placeholder="30"
            value={weight || ""}
            onChange={(event) =>
              onWeightChange(Number.parseInt(event.target.value) || 0)
            }
            disabled={disabled}
            className="max-w-[100px] text-xs sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
