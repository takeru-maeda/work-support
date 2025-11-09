import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  className,
  actions,
}: PropsWithChildren<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20 p-5 text-center sm:p-12",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {icon ? (
          <div className="rounded-full bg-muted p-4 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-md font-semibold text-foreground sm:text-lg">
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
