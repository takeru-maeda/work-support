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
      className={cn("overflow-x-auto overflow-y-auto", className)}
      style={{ height: `${height}px` }}
    >
      {children}
    </div>
  );
}
