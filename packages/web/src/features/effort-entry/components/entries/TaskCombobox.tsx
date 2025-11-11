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
  isLoading: boolean;
  onChange: (value: EffortSelectionValue) => void;
}

export function TaskCombobox({
  value,
  projectId,
  projectName,
  options,
  isLoading,
  onChange,
}: Readonly<TaskComboboxProps>) {
  const normalizedName: string = projectName.trim();
  const project: EffortProjectOption | undefined = options.find((option) =>
    projectId !== null
      ? option.id === projectId
      : option.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  const taskNames: string[] = project
    ? project.tasks.map((task) => task.name)
    : [];

  const handleChange = (next: string) => {
    const matched: Task | undefined = project?.tasks.find(
      (task) => task.name === next,
    );
    onChange({
      id: matched?.id ?? null,
      name: next,
    });
  };

  return (
    <EffortCombobox
      value={value.name}
      items={taskNames}
      placeholder="タスク"
      emptyLabel='"{value}" を追加'
      onChange={handleChange}
      isLoading={isLoading}
    />
  );
}
