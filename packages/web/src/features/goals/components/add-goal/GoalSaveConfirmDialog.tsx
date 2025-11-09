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

interface GoalSaveConfirmDialogProps {
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function GoalSaveConfirmDialog({
  open,
  isSaving,
  onOpenChange,
  onConfirm,
}: Readonly<GoalSaveConfirmDialogProps>) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>目標を保存してもよろしいですか？</AlertDialogTitle>
          <AlertDialogDescription>
            <p>
              ・新しい目標を保存すると、現在の最新目標は編集できなくなります。
            </p>
            <p>
              ・保存すると指定した期間の目標は新しく追加することができません。また、期間の更新を行うことはできません。
            </p>
            <p>続行してよろしいですか？</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>いいえ</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSaving}>
            はい
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
