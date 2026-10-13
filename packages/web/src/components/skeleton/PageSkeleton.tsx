import { ContentsAreaSkeleton } from "./ContentsAreaSkeleton";
import { HeaderSkeleton } from "./HeaderSkeleton";

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <ContentsAreaSkeleton />
    </div>
  );
}
