import { existingProjects } from "@/features/effort-entry/data";
import { EffortCombobox } from "@/features/effort-entry/components/entries/EffortCombobox";

interface ProjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProjectCombobox({
  value,
  onChange,
}: Readonly<ProjectComboboxProps>) {
  return (
    <EffortCombobox
      value={value}
      items={existingProjects}
      placeholder="案件"
      emptyLabel='"{value}" を追加'
      onChange={onChange}
    />
  );
}
