import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
  EffortSelectionValue,
} from "@/features/effort-entry/types";
import { DifferenceBadge } from "@/features/effort-entry/components/entries/DifferenceBadge";
import { ProjectCombobox } from "@/features/effort-entry/components/entries/ProjectCombobox";
import { TaskCombobox } from "@/features/effort-entry/components/entries/TaskCombobox";
import type { Task } from "@shared/schemas/projects";

interface EffortRowProps {
  entry: EffortEntry;
  index: number;
  isDragging: boolean;
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  errors?: EffortEntryError;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
}

export function EffortRow({
  entry,
  index,
  isDragging,
  projectOptions,
  isProjectLoading,
  errors,
  onUpdate,
  onRemove,
}: Readonly<EffortRowProps>) {
  const hasEstimated: boolean = entry.estimatedHours !== null;
  const difference: number | null =
    hasEstimated && entry.actualHours !== null && entry.estimatedHours !== null
      ? entry.actualHours - entry.estimatedHours
      : null;

  const resolvedProject: EffortProjectOption | undefined = projectOptions.find(
    (option) => option.id === entry.projectId,
  );
  const projectValue: EffortSelectionValue = {
    id: entry.projectId,
    name: entry.projectName || resolvedProject?.name || "",
  };

  const resolvedTask: Task | undefined = resolvedProject?.tasks.find(
    (task) => task.id === entry.taskId,
  );
  const taskValue: EffortSelectionValue = {
    id: entry.taskId,
    name: entry.taskName || resolvedTask?.name || "",
  };

  return (
    <section
      aria-label={`工数エントリー${index + 1}`}
      className={cn(
        "space-y-4 rounded-lg border p-4 transition-opacity",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-1 sm:gap-2">
        <div className="shrink-0 pt-2 hidden sm:block">
          <GripVertical className="size-4 sm:size-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-2 sm:space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
            <div>
              <ProjectCombobox
                value={projectValue}
                options={projectOptions}
                isError={errors?.project != null}
                isLoading={isProjectLoading}
                onChange={(selection) =>
                  onUpdate(entry.id, {
                    projectId: selection.id,
                    projectName: selection.name,
                    taskId: null,
                    taskName: "",
                  })
                }
              />
              {errors?.project && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.project}
                </p>
              )}
            </div>
            <div>
              <TaskCombobox
                value={taskValue}
                projectId={entry.projectId}
                projectName={projectValue.name}
                options={projectOptions}
                isError={errors?.task != null}
                isLoading={isProjectLoading}
                onChange={(selection) =>
                  onUpdate(entry.id, {
                    taskId: selection.id,
                    taskName: selection.name,
                  })
                }
              />
              {errors?.task && (
                <p className="mt-1 text-xs text-destructive">{errors.task}</p>
              )}
            </div>
          </div>

          <div className="grid items-center gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={entry.estimatedHours ?? ""}
              onChange={(event) =>
                onUpdate(entry.id, {
                  estimatedHours: (() => {
                    if (event.target.value === "") return null;
                    const parsed = Number.parseFloat(event.target.value);
                    return Number.isNaN(parsed) ? null : parsed;
                  })(),
                })
              }
              placeholder="見積工数(h)"
              className="text-sm"
            />

            <Input
              type="number"
              min="0"
              step="0.5"
              value={entry.actualHours ?? ""}
              onChange={(event) =>
                onUpdate(entry.id, {
                  actualHours: (() => {
                    if (event.target.value === "") return null;
                    const parsed = Number.parseFloat(event.target.value);
                    return Number.isNaN(parsed) ? null : parsed;
                  })(),
                })
              }
              placeholder="実績工数(h)"
              className={cn(
                "text-sm",
                errors?.actualHours && "border-destructive",
              )}
            />

            <div>
              <DifferenceBadge difference={difference} />
            </div>

            <div className="ml-auto hidden sm:block">
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

          <div
            className={cn(
              "grid items-center gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4",
              errors?.actualHours ? "" : "hidden",
            )}
          >
            <div />
            <p className="text-xs text-destructive">{errors?.actualHours}</p>
          </div>

          <div className="flex justify-end sm:hidden">
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
    </section>
  );
}
