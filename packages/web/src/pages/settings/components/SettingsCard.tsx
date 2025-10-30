import type { JSX, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import CardContainer from "@/components/shared/CardContainer";

interface SettingsCardProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

export function SettingsCard({
  icon: Icon,
  label,
  children,
}: Readonly<SettingsCardProps>): JSX.Element {
  return (
    <CardContainer className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-3">
        <Icon className="size-5" />
        {label}
      </h2>
      <div className="py-0 sm:py-4">{children}</div>
    </CardContainer>
  );
}
