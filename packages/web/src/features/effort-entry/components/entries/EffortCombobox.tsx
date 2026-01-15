import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  disabled?: boolean;
  isLoading?: boolean;
  isError: boolean;
}

export function EffortCombobox({
  value,
  items,
  placeholder,
  emptyLabel,
  onChange,
  disabled = false,
  isLoading = false,
  isError,
}: Readonly<EffortComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (next: string) => {
    if (open && next === "") {
      scrollPositionRef.current = {
        x: window.scrollX,
        y: window.scrollY,
      };
      requestAnimationFrame(() => {
        if (scrollPositionRef.current) {
          window.scrollTo(
            scrollPositionRef.current.x,
            scrollPositionRef.current.y,
          );
          scrollPositionRef.current = null;
        }
      });
    }
    setInputValue(next);
    onChange(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-transparent",
            isError &&
              "border-destructive-foreground dark:border-destructive-foreground h-8",
          )}
          disabled={disabled}
        >
          <span
            className={cn("truncate", !inputValue && "text-muted-foreground")}
          >
            {inputValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[calc(70vw)] sm:max-w-[calc(80vw)]"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={`${placeholder}を検索または入力...`}
            value={inputValue}
            onValueChange={handleInputChange}
            disabled={disabled}
          />
          <CommandList className="max-h-[calc(20vh)] sm:max-h-[calc(30vh)]">
            <CommandEmpty className="py-0">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground">
                  データを読み込み中です…
                </div>
              ) : (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSelect(inputValue)}
                    disabled={disabled || inputValue.trim().length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {emptyLabel.replace("{value}", inputValue || "")}
                  </Button>
                </div>
              )}
            </CommandEmpty>
            {items.length > 0 && (
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
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
