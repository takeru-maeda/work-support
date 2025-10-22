import { Badge } from "@/components/ui/badge";

interface DifferenceBadgeProps {
  difference: number;
}

export function DifferenceBadge({ difference }: Readonly<DifferenceBadgeProps>) {
  if (difference === 0) {
    return <Badge variant="secondary">±0</Badge>;
  }

  if (difference > 0) {
    return <Badge variant="destructive">+{difference.toFixed(1)}</Badge>;
  }

  return <Badge className="bg-green-500 hover:bg-green-600">{difference.toFixed(1)}</Badge>;
}
