import type React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { EffortEntry } from "@/features/effort/types";
import { EffortRow } from "@/features/effort/components/entries/EffortRow";

interface EffortEntriesProps {
  entries: EffortEntry[];
  draggedIndex: number | null;
  onAdd: () => void;
  onUpdate: (id: string, field: keyof EffortEntry, value: string | number) => void;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export function EffortEntries({
  entries,
  draggedIndex,
  onAdd,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Readonly<EffortEntriesProps>) {
  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          工数エントリーを追加してください
        </p>
      ) : (
        entries.map((entry, index) => (
          <EffortRow
            key={entry.id}
            entry={entry}
            index={index}
            isDragging={draggedIndex === index}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          />
        ))
      )}

      <Button variant="outline" size="sm" onClick={onAdd} className="w-full gap-2 bg-transparent">
        <Plus className="h-4 w-4" />
        工数エントリーを追加
      </Button>
    </div>
  );
}
