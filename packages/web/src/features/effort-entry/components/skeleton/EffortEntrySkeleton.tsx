import CardContainer from "@/components/shared/CardContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EffortEntrySkeletonProps {
  rows?: number;
  className?: string;
}

const EffortEntrySkeleton = ({
  rows = 1,
  className,
}: EffortEntrySkeletonProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }, (_, i) => i).map((i) => (
        <CardContainer key={i} className="space-y-2">
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-4" />
            <Skeleton className="h-8 w-100" />
            <Skeleton className="h-8 w-100" />
          </div>
          <div className="flex space-x-2 ml-6">
            <Skeleton className="h-8 w-49" />
            <Skeleton className="h-8 w-49" />
            <Skeleton className="h-8 w-11" />
            <Skeleton className="h-8 w-11" />
            <Skeleton className="h-8 w-8 ml-auto" />
          </div>
        </CardContainer>
      ))}
    </div>
  );
};

export default EffortEntrySkeleton;
