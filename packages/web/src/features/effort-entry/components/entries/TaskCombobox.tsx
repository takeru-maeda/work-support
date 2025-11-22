import { EffortCombobox } from "@/features/effort-entry/components/entries/EffortCombobox";
import type {
  EffortProjectOption,
  EffortSelectionValue,
} from "@/features/effort-entry/types";
import type { Task } from "@shared/schemas/projects";

interface TaskComboboxProps {
  value: EffortSelectionValue;
  projectId: number | null;
  projectName: string;
  options: EffortProjectOption[];
  isError: boolean;
  isLoading: boolean;
  onChange: (value: EffortSelectionValue) => void;
  excludedTaskIds?: number[];
}

export function TaskCombobox({
  value,
  projectId,
  projectName,
  options,
  isError,
  isLoading,
  onChange,
  excludedTaskIds = [],
}: Readonly<TaskComboboxProps>) {
  const normalizedName: string = projectName.trim();
  const project: EffortProjectOption | undefined = options.find((option) =>
    projectId !== null
      ? option.id === projectId
      : option.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  const availableTasks: Task[] = project
    ? project.tasks.filter((task) => {
        if (task.id === value.id) return true;
        return !excludedTaskIds.includes(task.id);
      })
    : [];
  const taskNames: string[] = availableTasks.map((task) => task.name);
  const resolvedValue: string =
    value.name.trim().length > 0
      ? value.name
      : project?.tasks.find((task) => task.id === value.id)?.name ?? "";

  const handleChange = (next: string) => {
    const matched: Task | undefined = availableTasks.find(
      (task) => task.name === next,
    );
    onChange({
      id: matched?.id ?? null,
      name: next,
    });
  };

  return (
    <EffortCombobox
      value={resolvedValue}
      items={taskNames}
      placeholder="タスク"
      emptyLabel='"{value}" を追加'
      onChange={handleChange}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
