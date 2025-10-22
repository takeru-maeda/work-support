import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PastGoal } from "@/features/goals/types";

interface PastGoalContentDialogProps {
  open: boolean;
  goal: PastGoal | null;
  onOpenChange: (open: boolean) => void;
}

export function PastGoalContentDialog({
  open,
  goal,
  onOpenChange,
}: Readonly<PastGoalContentDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal?.name}</DialogTitle>
          <DialogDescription>目標の詳細内容</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {goal?.content || "内容が設定されていません。"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
