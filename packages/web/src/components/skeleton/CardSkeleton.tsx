import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: Readonly<CardSkeletonProps>) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
