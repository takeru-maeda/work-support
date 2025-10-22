import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  containerClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  containerClassName,
  descriptionClassName,
}: Readonly<SectionHeaderProps>) {
  return (
    <div className={cn("flex items-center gap-3", containerClassName)}>
      <div className={cn("rounded-lg p-2", iconClassName)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold leading-none tracking-tight text-card-foreground">
          {title}
        </h3>
        <p
          className={cn(
            "mt-1.5 text-sm text-muted-foreground",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
