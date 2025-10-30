import { User } from "lucide-react";

import { Input } from "@/components/ui/input";
import CardContainer from "@/components/shared/CardContainer";
import { FormActions } from "@/components/form/FormActions";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/sections/SectionHeader";

interface ProfileNameSectionProps {
  name: string;
  isEditing: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  beginEditing: () => void;
}

export function ProfileNameSection({
  name,
  isEditing,
  saving,
  onChange,
  onSave,
  onCancel,
  beginEditing,
}: Readonly<ProfileNameSectionProps>) {
  return (
    <CardContainer className="space-y-4">
      <SectionHeader
        icon={User}
        iconClassName="bg-chart-2/10 text-chart-2"
        title="ユーザー名"
        titleClassName="text-md"
      />
      {isEditing ? (
        <Input
          id="name"
          value={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder="山田 太郎"
        />
      ) : (
        <p className="text-foreground">{name || "未設定"}</p>
      )}

      <div className="flex gap-2 justify-end">
        {isEditing ? (
          <FormActions
            saveLabel={saving ? "保存中..." : "保存"}
            onCancel={onCancel}
            onSave={onSave}
            saveDisabled={saving}
          />
        ) : (
          <Button onClick={beginEditing} disabled={saving}>
            編集
          </Button>
        )}
      </div>
    </CardContainer>
  );
}
