import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import type { Goal } from "@/features/goals/types";

interface GoalDeleteConfirmDialogProps {
  goal: Goal | null;
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (goal: Goal) => Promise<void> | void;
}

export function GoalDeleteConfirmDialog({
  goal,
  open,
  isDeleting,
  onOpenChange,
  onConfirm,
}: Readonly<GoalDeleteConfirmDialogProps>) {
  const [confirmation, setConfirmation] = useState<string>("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmation("");
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!goal) return;
    await onConfirm(goal);
    setConfirmation("");
  };

  const isMatch = confirmation.trim() === (goal?.name ?? "");

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>目標を削除してもよろしいですか？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              この操作は取り消せません。削除を実行するには、以下に
              <span className="font-semibold">「{goal?.name ?? ""}」</span>
              と入力してください。
            </p>
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="目標名を入力"
              disabled={isDeleting}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!goal || isDeleting || !isMatch}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
