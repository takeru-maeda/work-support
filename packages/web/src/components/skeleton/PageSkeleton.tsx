import { HeaderSkeleton } from "./HeaderSkeleton";
import { ContentsAreaSkeleton } from "./ContentsAreaSkeleton";

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <ContentsAreaSkeleton />
    </div>
  );
}
