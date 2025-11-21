import { useMemo } from "react";
import { Plus } from "lucide-react";

import CardContainer from "@/components/shared/CardContainer";
import { Button } from "@/components/ui/button";
import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
} from "@/features/effort-entry/types";
import { ProjectGroupCard } from "./ProjectGroupCard";
import { getProjectGroupKey } from "./utils";

interface EffortEntriesProps {
  entries: EffortEntry[];
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  entryErrors: Record<string, EffortEntryError | undefined>;
  onAdd: (initial?: Partial<EffortEntry>) => void;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
}

interface ProjectGroup {
  key: string;
  entries: EffortEntry[];
}

export const EffortEntries = ({
  entries,
  projectOptions,
  isProjectLoading,
  entryErrors,
  onAdd,
  onUpdate,
  onRemove,
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

    return order.map((key) => ({
      key,
      entries: map.get(key)!,
    }));
  }, [entries]);

  const handleAddProject = (): void => {
    onAdd();
  };

  return (
    <div className="space-y-4">
      {groupedEntries.length === 0 ? (
        <CardContainer className="shadow-none">
          <p className="py-4 text-center text-muted-foreground text-sm sm:text-md">
            工数エントリーを追加してください
          </p>
        </CardContainer>
      ) : (
        groupedEntries.map((group) => (
          <ProjectGroupCard
            key={group.key}
            entries={group.entries}
            projectOptions={projectOptions}
            isProjectLoading={isProjectLoading}
            entryErrors={entryErrors}
            onAddTask={onAdd}
            onUpdate={onUpdate}
            onRemove={onRemove}
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
  );
};
