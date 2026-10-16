import { Badge } from "@/components/ui/badge";
import { formatWorkHours } from "@/lib/formatHours";

interface DifferenceBadgeProps {
  difference: number | null;
}

export function DifferenceBadge({
  difference,
}: Readonly<DifferenceBadgeProps>) {
  if (difference === null) return null;

  if (difference === 0) {
    return <Badge variant="secondary">±0</Badge>;
  }

  const formatted: string = formatWorkHours(Math.abs(difference));

  if (difference > 0) {
    return <Badge variant="destructive">+{formatted}</Badge>;
  }

  return (
    <Badge className="bg-green-500 hover:bg-green-600">-{formatted}</Badge>
  );
}
