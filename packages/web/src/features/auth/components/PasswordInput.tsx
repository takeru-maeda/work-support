import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof Input>;

interface PasswordInputProps extends Omit<InputProps, "type"> {
  label: string;
  showLabel?: string;
  hideLabel?: string;
}

/**
 * パスワードの表示／非表示を切り替えられる入力フィールドを描画します。
 *
 * @param props パスワード入力に必要なプロパティ
 * @returns パスワード入力コンポーネント
 */
export function PasswordInput({
  label,
  showLabel = "パスワードを表示",
  hideLabel = "パスワードを非表示",
  className,
  id,
  ...props
}: Readonly<PasswordInputProps>) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleLabel: string = isVisible ? hideLabel : showLabel;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition hover:text-foreground"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
