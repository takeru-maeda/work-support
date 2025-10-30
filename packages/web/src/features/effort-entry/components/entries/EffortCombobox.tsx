import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";

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

interface EffortComboboxProps {
  value: string;
  items: string[];
  placeholder: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}

export function EffortCombobox({
  value,
  items,
  placeholder,
  emptyLabel,
  onChange,
}: Readonly<EffortComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (next: string) => {
    setInputValue(next);
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          <span
            className={cn("truncate", !inputValue && "text-muted-foreground")}
          >
            {inputValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`${placeholder}を検索または入力...`}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty className="py-0">
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleSelect(inputValue)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {emptyLabel.replace("{value}", inputValue || "")}
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      "mr-1 h-4 w-4",
                      value === item ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
