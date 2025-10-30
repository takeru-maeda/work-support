import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface PageSizeSelectProps {
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  itemsPerPageOptions: number[];
  className?: string;
}

const PageSizeSelect = ({
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions,
  className,
}: PageSizeSelectProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">表示件数:</span>
      <Select
        value={String(itemsPerPage)}
        onValueChange={(value) => onItemsPerPageChange(Number(value))}
      >
        <SelectTrigger className="min-w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {itemsPerPageOptions.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}件
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PageSizeSelect;
