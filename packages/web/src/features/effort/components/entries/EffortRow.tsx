import type React from "react";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { EffortEntry } from "@/features/effort/types";
import { DifferenceBadge } from "@/features/effort/components/entries/DifferenceBadge";
import { ProjectCombobox } from "@/features/effort/components/entries/ProjectCombobox";
import { TaskCombobox } from "@/features/effort/components/entries/TaskCombobox";

interface EffortRowProps {
  entry: EffortEntry;
  index: number;
  isDragging: boolean;
  onUpdate: (
    id: string,
    field: keyof EffortEntry,
    value: string | number,
  ) => void;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const calculateDifference = (estimated: number, actual: number) =>
  actual - estimated;

export function EffortRow({
  entry,
  index,
  isDragging,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Readonly<EffortRowProps>) {
  const difference = calculateDifference(
    entry.estimatedHours,
    entry.actualHours,
  );

  return (
    <section
      draggable
      aria-label={`工数エントリー${index + 1}`}
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-move space-y-4 rounded-lg border p-4 transition-opacity",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 pt-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProjectCombobox
              value={entry.project}
              onChange={(value) => onUpdate(entry.id, "project", value)}
            />
            <TaskCombobox
              value={entry.task}
              onChange={(value) => onUpdate(entry.id, "task", value)}
            />
          </div>

          <div className="grid items-end gap-4 grid-cols-2 sm:grid-cols-4">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={entry.estimatedHours || ""}
              onChange={(event) =>
                onUpdate(
                  entry.id,
                  "estimatedHours",
                  Number.parseFloat(event.target.value) || 0,
                )
              }
              placeholder="見積工数(h)"
            />

            <Input
              type="number"
              min="0"
              step="0.5"
              value={entry.actualHours || ""}
              onChange={(event) =>
                onUpdate(
                  entry.id,
                  "actualHours",
                  Number.parseFloat(event.target.value) || 0,
                )
              }
              placeholder="実績工数(h)"
            />

            <div className="flex items-center gap-2 h-10">
              <span className="font-semibold">{difference.toFixed(1)}h</span>
              <DifferenceBadge difference={difference} />
            </div>

            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(entry.id)}
                className="h-10 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
