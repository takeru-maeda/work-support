import type React from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
} from "@/features/effort-entry/types";
import { EffortRow } from "@/features/effort-entry/components/entries/EffortRow";

interface SortableEffortRowProps {
  entry: EffortEntry;
  index: number;
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  errors?: EffortEntryError;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
}

export function SortableEffortRow({
  entry,
  index,
  projectOptions,
  isProjectLoading,
  errors,
  onUpdate,
  onRemove,
}: Readonly<SortableEffortRowProps>) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EffortRow
        entry={entry}
        index={index}
        projectOptions={projectOptions}
        isProjectLoading={isProjectLoading}
        errors={errors}
        isDragging={isDragging}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
}
