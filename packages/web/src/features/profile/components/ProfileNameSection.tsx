import { User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileNameSectionProps {
  isEditing: boolean;
  name: string;
  onChange: (value: string) => void;
}

export function ProfileNameSection({
  isEditing,
  name,
  onChange,
}: Readonly<ProfileNameSectionProps>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="name" className="flex items-center gap-2">
        <User className="h-4 w-4" />
        ユーザー名
      </Label>
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
    </div>
  );
}
