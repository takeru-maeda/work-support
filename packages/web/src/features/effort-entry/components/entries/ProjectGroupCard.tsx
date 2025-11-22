import type { JSX } from "react";
import { GripVertical, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
  EffortSelectionValue,
} from "@/features/effort-entry/types";
import { ProjectCombobox } from "./ProjectCombobox";
import { TaskRow } from "./TaskRow";
import { projectErrorMessage } from "@/features/effort-entry/utils/projectErrors";

export interface ProjectGroupCardProps {
  entries: EffortEntry[];
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  entryErrors: Record<string, EffortEntryError | undefined>;
  onAddTask: (initial?: Partial<EffortEntry>) => void;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
  excludedProjectIds?: number[];
  excludedTaskIds?: number[];
}

export const ProjectGroupCard = ({
  entries,
  projectOptions,
  isProjectLoading,
  entryErrors,
  onAddTask,
  onUpdate,
  onRemove,
  excludedProjectIds = [],
  excludedTaskIds = [],
}: Readonly<ProjectGroupCardProps>): JSX.Element => {
  const projectError: string | undefined = projectErrorMessage(
    entries,
    entryErrors,
  );

  const handleProjectChange = (selection: EffortSelectionValue): void => {
    for (const entry of entries) {
      onUpdate(entry.id, {
        projectId: selection.id,
        projectName: selection.name,
        taskId: null,
        taskName: "",
      });
    }
  };

  const handleAddTask = (): void => {
    const base: EffortEntry = entries[0];
    onAddTask({
      projectId: base.projectId,
      projectName: base.projectName,
      projectGroupId: base.projectGroupId,
      taskId: null,
      taskName: "",
      estimatedHours: null,
      actualHours: null,
    });
  };

  const handleRemoveProject = (): void => {
    for (const entry of entries) {
      onRemove(entry.id);
    }
  };

  return (
    <div className="relative rounded-xl border border-border bg-card p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveProject}
        aria-label="案件を削除"
        className="absolute -right-2 -top-2 size-6 rounded-full border border-border bg-card"
      >
        <X className="size-3 text-muted-foreground" />
      </Button>
      <div className="flex">
        <div className="hidden shrink-0 py-2 pr-2 text-muted-foreground sm:block">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex-1">
            <ProjectCombobox
              value={{
                id: entries[0]?.projectId ?? null,
                name: entries[0]?.projectName ?? "",
              }}
              options={projectOptions}
              isError={Boolean(projectError)}
              isLoading={isProjectLoading}
              onChange={handleProjectChange}
              excludedProjectIds={excludedProjectIds}
            />
            {projectError && (
              <p className="mt-1 text-xs text-destructive-foreground">
                {projectError}
              </p>
            )}
          </div>

          <div className="space-y-3 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-muted">
            {entries.map((entry) => (
              <TaskRow
                key={entry.id}
                entry={entry}
                entryError={entryErrors[entry.id]}
                projectOptions={projectOptions}
                isProjectLoading={isProjectLoading}
                onUpdate={onUpdate}
                onRemove={onRemove}
                excludedTaskIds={excludedTaskIds}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddTask}
        className="w-full gap-2 bg-transparent mt-3"
      >
        <Plus className="h-4 w-4" />
        タスクを追加
      </Button>
    </div>
  );
};
