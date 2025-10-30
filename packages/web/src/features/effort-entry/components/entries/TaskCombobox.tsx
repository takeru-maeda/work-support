import { existingTasks } from "@/features/effort-entry/data";
import { EffortCombobox } from "@/features/effort-entry/components/entries/EffortCombobox";

interface TaskComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskCombobox({ value, onChange }: Readonly<TaskComboboxProps>) {
  return (
    <EffortCombobox
      value={value}
      items={existingTasks}
      placeholder="タスク"
      emptyLabel='"{value}" を追加'
      onChange={onChange}
    />
  );
}
