import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  titleClassName?: string;
  description?: string;
  containerClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  icon: Icon,
  iconClassName,
  title,
  titleClassName,
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
        <h3
          className={cn(
            "text-lg font-semibold leading-none tracking-tight text-card-foreground",
            titleClassName,
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "mt-1.5 text-sm text-muted-foreground",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
