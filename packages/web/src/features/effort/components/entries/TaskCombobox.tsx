import { existingTasks } from "@/features/effort/data";

import { EffortCombobox } from "@/features/effort/components/entries/EffortCombobox";

interface TaskComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskCombobox({ value, onChange }: Readonly<TaskComboboxProps>) {
  return (
    <EffortCombobox
      value={value}
      items={existingTasks}
      placeholder="タスクを選択..."
      emptyLabel='"{value}" を追加'
      onChange={onChange}
    />
  );
}
