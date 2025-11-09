import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Goal } from "@/features/goals/types";

interface GoalContentDialogProps {
  open: boolean;
  goal: Goal | null;
  editedContent: string;
  onContentChange: (value: string) => void;
  onSave: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function GoalContentDialog({
  open,
  goal,
  editedContent,
  onContentChange,
  onSave,
  onOpenChange,
}: Readonly<GoalContentDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(90vh)] overflow-auto">
        <DialogHeader>
          <DialogTitle>{goal?.name}</DialogTitle>
          <DialogDescription>目標の詳細内容を編集できます</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Textarea
            value={editedContent}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="目標の内容を入力してください"
            className="min-h-[100px] resize-y max-h-[calc(70vh-80px)] text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={() => void onSave()}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
