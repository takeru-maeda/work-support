import type { JSX } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DifferenceBadge } from "@/features/effort-entry/components/entries/DifferenceBadge";
import { TaskCombobox } from "@/features/effort-entry/components/entries/TaskCombobox";
import type {
  EffortEntry,
  EffortEntryError,
  EffortProjectOption,
} from "@/features/effort-entry/types";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  entry: EffortEntry;
  entryError?: EffortEntryError;
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  onUpdate: (id: string, changes: Partial<EffortEntry>) => void;
  onRemove: (id: string) => void;
  excludedTaskIds?: number[];
}

export const TaskRow = ({
  entry,
  entryError,
  projectOptions,
  isProjectLoading,
  onUpdate,
  onRemove,
  excludedTaskIds = [],
}: Readonly<TaskRowProps>): JSX.Element => {
  const difference: number | null =
    entry.estimatedHours !== null && entry.actualHours !== null
      ? entry.actualHours - entry.estimatedHours
      : null;

  const taskError: string | undefined = entryError?.task;
  const actualError: string | undefined = entryError?.actualHours;

  return (
    <>
      <Separator className="sm:hidden" />
      <div className="grid gap-2 sm:gap-3 sm:grid-cols-[minmax(0,1fr)_300px] sm:items-start">
        <div>
          <TaskCombobox
            value={{
              id: entry.taskId,
              name: entry.taskName,
            }}
            projectId={entry.projectId}
            projectName={entry.projectName}
            options={projectOptions}
            isError={Boolean(taskError)}
            isLoading={isProjectLoading}
            onChange={(selection) =>
              onUpdate(entry.id, {
                taskId: selection.id,
                taskName: selection.name,
              })
            }
            excludedTaskIds={excludedTaskIds}
          />
          {taskError && (
            <p className="mt-1 ml-1 text-xs text-destructive-foreground">
              {taskError}
            </p>
          )}
        </div>

        <div className="grid items-start gap-2 sm:gap-3 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_50px_30px]">
          <Input
            type="number"
            min="0"
            step="0.25"
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
            placeholder="見積(h)"
            className="text-sm"
          />

          <div>
            <Input
              type="number"
              min="0"
              step="0.25"
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
              placeholder="実績(h)"
              className={cn(
                "text-sm",
                actualError && "border-destructive-foreground",
              )}
            />
            {actualError && (
              <p className="mt-1 ml-1 text-xs text-destructive-foreground">
                {actualError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center h-8">
            <DifferenceBadge difference={difference} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(entry.id)}
            className="h-8 w-8 ml-auto justify-center text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
