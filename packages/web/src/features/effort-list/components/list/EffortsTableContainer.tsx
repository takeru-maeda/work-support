import type { ReactNode, JSX } from "react";
import { cn } from "@/lib/utils";

interface EffortsTableContainerProps {
  height: number;
  children: ReactNode;
  className?: string;
}

export function EffortsTableContainer({
  height,
  children,
  className,
}: Readonly<EffortsTableContainerProps>): JSX.Element {
  return (
    <div
      className={cn(
        "custom-scrollbar overflow-x-auto overflow-y-auto [&_[data-slot=table-container]]:overflow-visible",
        className,
      )}
      style={{ height: `${height}px` }}
    >
      {children}
    </div>
  );
}
