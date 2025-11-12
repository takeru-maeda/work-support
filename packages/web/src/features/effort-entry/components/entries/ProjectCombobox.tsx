import { EffortCombobox } from "@/features/effort-entry/components/entries/EffortCombobox";
import type {
  EffortProjectOption,
  EffortSelectionValue,
} from "@/features/effort-entry/types";

interface ProjectComboboxProps {
  value: EffortSelectionValue;
  options: EffortProjectOption[];
  isError: boolean;
  isLoading: boolean;
  onChange: (value: EffortSelectionValue) => void;
}

export function ProjectCombobox({
  value,
  options,
  isError,
  isLoading,
  onChange,
}: Readonly<ProjectComboboxProps>) {
  const projectNames: string[] = options.map((option) => option.name);

  const handleChange = (next: string) => {
    const matched: EffortProjectOption | undefined = options.find(
      (option) => option.name === next,
    );
    onChange({
      id: matched?.id ?? null,
      name: next,
    });
  };

  return (
    <EffortCombobox
      value={value.name}
      items={projectNames}
      placeholder="案件"
      emptyLabel='"{value}" を追加'
      onChange={handleChange}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
