import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onCancel: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  saveDisabled?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  cancelDisabled?: boolean;
  className?: string;
}

export function FormActions({
  onCancel,
  onSave,
  saveDisabled = false,
  cancelLabel = "キャンセル",
  saveLabel = "保存",
  cancelDisabled = false,
  className,
}: Readonly<FormActionsProps>) {
  return (
    <div className={`flex justify-end gap-3 ${className ?? ""}`}>
      <Button variant="outline" onClick={onCancel} disabled={cancelDisabled}>
        {cancelLabel}
      </Button>
      <Button onClick={onSave} disabled={saveDisabled}>
        {saveLabel}
      </Button>
    </div>
  );
}
