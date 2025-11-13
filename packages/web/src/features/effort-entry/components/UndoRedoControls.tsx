import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { JSX } from "react";

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Readonly<UndoRedoControlsProps>): JSX.Element {
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="元に戻す"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="やり直す"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
