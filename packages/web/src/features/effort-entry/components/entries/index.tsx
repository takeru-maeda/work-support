import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
} from "@/features/effort-entry/types";
import { SortableEffortRow } from "@/features/effort-entry/components/entries/SortableEffortRow";
import CardContainer from "@/components/shared/CardContainer";

interface EffortEntriesProps {
  entries: EffortEntry[];
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  entryErrors: Record<string, EffortEntryError | undefined>;
  onAdd: () => void;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}

export function EffortEntries({
  entries,
  projectOptions,
  isProjectLoading,
  entryErrors,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
}: Readonly<EffortEntriesProps>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <CardContainer className="shadow-none">
          <p className="py-4 text-center text-muted-foreground text-sm sm:text-md">
            工数エントリーを追加してください
          </p>
        </CardContainer>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={entries.map((entry) => entry.id)}
            strategy={verticalListSortingStrategy}
          >
            {entries.map((entry, index) => (
              <SortableEffortRow
                key={entry.id}
                entry={entry}
                index={index}
                projectOptions={projectOptions}
                isProjectLoading={isProjectLoading}
                errors={entryErrors[entry.id]}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="w-full gap-2 bg-transparent"
      >
        <Plus className="h-4 w-4" />
        工数エントリーを追加
      </Button>
    </div>
  );
}
