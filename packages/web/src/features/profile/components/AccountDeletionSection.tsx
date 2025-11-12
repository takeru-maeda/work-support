import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { SectionHeader } from "@/components/sections/SectionHeader";
import CardContainer from "@/components/shared/CardContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface AccountDeletionSectionProps {
  email: string;
  isDeleting: boolean;
  onConfirm: () => Promise<boolean>;
}

/**
 * アカウント削除の確認ダイアログ付きセクションを表示します。
 */
export function AccountDeletionSection({
  email,
  isDeleting,
  onConfirm,
}: Readonly<AccountDeletionSectionProps>) {
  const [open, setOpen] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<string>("");

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmation("");
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (confirmation !== email || isDeleting) return;
    const success: boolean = await onConfirm();
    if (success) {
      setConfirmation("");
      setOpen(false);
    }
  }, [confirmation, email, isDeleting, onConfirm]);

  const isMatch: boolean = confirmation === email;

  return (
    <CardContainer className="space-y-6 border-destructive-foreground">
      <SectionHeader
        icon={AlertTriangle}
        iconClassName="bg-destructive-foreground/10 text-destructive-foreground"
        title="アカウント削除"
        description="この操作は取り消せません。すべてのデータが削除されます。"
        titleClassName="text-md text-destructive-foreground"
      />

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          アカウントを削除すると、これまで登録した工数や目標を含む全データが完全に削除されます。
        </p>
        <Button
          variant="destructive"
          className="w-full sm:w-fit"
          onClick={() => handleOpenChange(true)}
          disabled={isDeleting}
        >
          アカウントを削除する
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle>
              本当にアカウントを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                この操作は元に戻せません。確認のため、メールアドレスを入力してください。
              </p>
              <Input
                type="email"
                placeholder={email}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isDeleting}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={!isMatch || isDeleting}
              className="bg-destructive-foreground text-white hover:bg-destructive-foreground/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContainer>
  );
}
