import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CommandFilterSelectProps {
  placeholder: string;
  value?: string;
  onChange: (value: string) => void;
  options: { id: number; name: string }[];
  allValue: string;
  allLabel: string;
  isLoading?: boolean;
}

export function CommandFilterSelect({
  placeholder,
  value,
  onChange,
  options,
  allValue,
  allLabel,
  isLoading = false,
}: Readonly<CommandFilterSelectProps>) {
  const [open, setOpen] = useState<boolean>(false);

  const displayLabel: string =
    value === undefined || value === ""
      ? placeholder
      : value === allValue
        ? allLabel
        : options.find((option) => String(option.id) === value)?.name ||
          placeholder;

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between flex-1 h-8"
        >
          <span
            className={cn(
              "truncate",
              !displayLabel || displayLabel === placeholder
                ? "text-muted-foreground"
                : undefined,
            )}
          >
            {displayLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder={`${placeholder}を検索...`} />
          <CommandList className="max-h-[calc(30vh)]">
            <CommandEmpty>
              {isLoading ? "読み込み中です..." : "候補が見つかりません"}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={allLabel}
                onSelect={() => handleSelect(allValue)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === allValue ? "opacity-100" : "opacity-0",
                  )}
                />
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => handleSelect(String(option.id))}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === String(option.id) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
