import { cn } from "@/lib/utils";
import { formatWorkHours } from "../../utils/formatHours";

interface DifferenceLabelProps {
  difference: number | null;
  commonStyle?: string;
}

const DifferenceLabel = ({ difference, commonStyle }: DifferenceLabelProps) => {
  const style = cn("font-bold", commonStyle);
  if (difference === null)
    return <p className={cn("text-muted-foreground", style)}>-</p>;

  if (difference === 0) {
    return <p className={style}>±0h</p>;
  }

  const formatted: string = formatWorkHours(Math.abs(difference));

  if (difference > 0) {
    return <p className={cn("text-destructive", style)}>+{formatted}h</p>;
  }

  return <p className={cn("text-green-500", style)}>-{formatted}h</p>;
};

export default DifferenceLabel;
