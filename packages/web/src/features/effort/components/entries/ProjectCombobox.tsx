import { existingProjects } from "@/features/effort/data";

import { EffortCombobox } from "@/features/effort/components/entries/EffortCombobox";

interface ProjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProjectCombobox({ value, onChange }: Readonly<ProjectComboboxProps>) {
  return (
    <EffortCombobox
      value={value}
      items={existingProjects}
      placeholder="案件を選択..."
      emptyLabel='"{value}" を追加'
      onChange={onChange}
    />
  );
}
