import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "../shared/PageContainer";
import { CardSkeleton } from "./CardSkeleton";
import { TableSkeleton } from "./TableSkeleton";

export function ContentsAreaSkeleton() {
  return (
    <PageContainer>
      <div className="mb-6 sm:mb-8 space-y-6">
        {/* タイトル */}
        <div className="space-y-2">
          <Skeleton className="h-10 sm:h-12 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-6">
          {[1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        <TableSkeleton />
      </div>
    </PageContainer>
  );
}
