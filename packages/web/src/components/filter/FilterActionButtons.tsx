import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { JSX } from "react";

interface FilterActionButtonsProps {
  onApply: () => void;
  onClear: () => void;
  className?: string;
  applyLabel?: string;
  clearLabel?: string;
  applyDisabled?: boolean;
  clearDisabled?: boolean;
}

export function FilterActionButtons({
  onApply,
  onClear,
  className,
  applyLabel = "絞り込み",
  clearLabel = "クリア",
  applyDisabled = false,
  clearDisabled = false,
}: Readonly<FilterActionButtonsProps>): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row justify-end gap-2 pt-1",
        className,
      )}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="w-full sm:w-auto bg-transparent"
        disabled={clearDisabled}
      >
        <X className="h-4 w-4 mr-2" />
        {clearLabel}
      </Button>
      <Button
        size="sm"
        onClick={onApply}
        className="w-full sm:w-auto"
        disabled={applyDisabled}
      >
        <Search className="h-4 w-4 mr-2" />
        {applyLabel}
      </Button>
    </div>
  );
}
