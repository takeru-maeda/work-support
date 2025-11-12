import { type JSX } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ConfirmEffortSubmitDialogProps {
  open: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onRequestOpen: () => void;
}

/**
 * 工数送信前の確認ダイアログを表示します。
 *
 * @param props コンポーネントのプロパティ
 * @returns 送信確認ダイアログ
 */
export function ConfirmEffortSubmitDialog({
  open,
  disabled,
  isSubmitting,
  onOpenChange,
  onConfirm,
  onRequestOpen,
}: Readonly<ConfirmEffortSubmitDialogProps>): JSX.Element {
  return (
    <>
      <Button
        size="lg"
        disabled={disabled}
        className="w-full sm:w-auto"
        onClick={onRequestOpen}
      >
        {isSubmitting ? "送信中..." : "送信"}
      </Button>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>工数を登録します</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              よろしければ「送信する」をクリックしてください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
              送信する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
