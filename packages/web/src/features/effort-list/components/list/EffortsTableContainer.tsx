import { cn } from "@/lib/utils";

import type { ReactNode, JSX } from "react";

interface EffortsTableContainerProps {
  children: ReactNode;
  className?: string;
}

export function EffortsTableContainer({
  children,
  className,
}: Readonly<EffortsTableContainerProps>): JSX.Element {
  return (
    <div
      className={cn(
        "custom-scrollbar overflow-x-auto overflow-y-auto **:data-[slot=table-container]:overflow-visible max-h-[calc(60dvh)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
