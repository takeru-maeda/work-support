import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  className?: string;
}

export function FormActions({
  onCancel,
  onSave,
  saveDisabled = false,
  cancelLabel = "キャンセル",
  saveLabel = "保存",
  className,
}: Readonly<FormActionsProps>) {
  return (
    <div className={`flex justify-end gap-3 ${className ?? ""}`}>
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button onClick={onSave} disabled={saveDisabled}>
        {saveLabel}
      </Button>
    </div>
  );
}
