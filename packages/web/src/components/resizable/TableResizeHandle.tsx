import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JSX } from "react";

interface TableResizeHandleProps {
  onResizeStart: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isActive?: boolean;
  className?: string;
}

export function TableResizeHandle({
  onResizeStart,
  isActive = false,
  className,
}: Readonly<TableResizeHandleProps>): JSX.Element {
  return (
    <button
      type="button"
      aria-label="テーブルサイズを変更"
      className={cn(
        "flex h-3 w-full cursor-ns-resize items-center justify-center border-t border-border bg-muted/30 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "bg-muted/70",
        className,
      )}
      onMouseDown={onResizeStart}
    >
      <GripHorizontal className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
