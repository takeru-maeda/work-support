import { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import CardContainer from "@/components/shared/CardContainer";
import { Button } from "@/components/ui/button";
import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
} from "@/features/effort-entry/types";
import { SortableProjectGroupCard } from "./SortableProjectGroupCard";
import { getProjectGroupKey } from "@/features/effort-entry/utils/projectGrouping";

interface EffortEntriesProps {
  entries: EffortEntry[];
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  entryErrors: Record<string, EffortEntryError | undefined>;
  onAdd: (initial?: Partial<EffortEntry>) => void;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
  onReorderProjects: (sourceKey: string, targetKey: string) => void;
}

interface ProjectGroup {
  key: string;
  entries: EffortEntry[];
  projectId: number | null;
  projectGroupId: string;
}

export const EffortEntries = ({
  entries,
  projectOptions,
  isProjectLoading,
  entryErrors,
  onAdd,
  onUpdate,
  onRemove,
  onReorderProjects,
}: Readonly<EffortEntriesProps>) => {
  const groupedEntries: ProjectGroup[] = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, EffortEntry[]>();

    for (const entry of entries) {
      const key = getProjectGroupKey(entry);
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(entry);
    }

    return order.map((key) => {
      const groupEntries = map.get(key)!;
      return {
        key,
        entries: groupEntries,
        projectId: groupEntries[0]?.projectId ?? null,
        projectGroupId: groupEntries[0]?.projectGroupId ?? groupEntries[0]?.id,
      };
    });
  }, [entries]);

  const selectedProjectIds: number[] = groupedEntries.reduce<number[]>(
    (acc, group) => {
      if (group.projectId !== null) {
        acc.push(group.projectId);
      }
      return acc;
    },
    [],
  );

  const taskMap: Record<string, number[]> = groupedEntries.reduce(
    (acc, group) => {
      const taskIds: number[] = group.entries
        .map((entry) => entry.taskId)
        .filter((id): id is number => id !== null);
      acc[group.key] = taskIds;
      return acc;
    },
    {} as Record<string, number[]>,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderProjects(String(active.id), String(over.id));
  };

  const handleAddProject = (): void => {
    onAdd();
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={groupedEntries.map((group) => group.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {groupedEntries.length === 0 ? (
            <CardContainer className="shadow-none">
              <p className="py-4 text-center text-muted-foreground text-sm sm:text-md">
                工数エントリーを追加してください
              </p>
            </CardContainer>
          ) : (
            groupedEntries.map((group) => (
              <SortableProjectGroupCard
                key={group.key}
                id={group.key}
                entries={group.entries}
                projectOptions={projectOptions}
                isProjectLoading={isProjectLoading}
                entryErrors={entryErrors}
                onAddTask={onAdd}
                onUpdate={onUpdate}
                onRemove={onRemove}
                excludedProjectIds={selectedProjectIds.filter(
                  (id) => id !== group.projectId,
                )}
                excludedTaskIds={taskMap[group.key] ?? []}
              />
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddProject}
            className="w-full gap-2 bg-transparent"
          >
            <Plus className="h-4 w-4" />
            工数エントリーを追加
          </Button>
        </div>
      </SortableContext>
    </DndContext>
  );
};
