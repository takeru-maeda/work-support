import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderHomeLink } from "@/components/layout/header/AppHeaderHomeLink";
import { Menu } from "lucide-react";

export function HeaderSkeleton() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <AppHeaderHomeLink />

        {/* ナビゲーションスケルトン */}
        <div className="flex items-center gap-4">
          <Skeleton className="hidden md:block h-4 w-20" />
          <Skeleton className="hidden md:block h-4 w-20" />
          <Skeleton className="hidden md:block h-4 w-20" />
          <Skeleton className="hidden md:block h-4 w-20" />

          {/* ユーザーアイコンスケルトン */}
          <Skeleton className="h-10 w-10 rounded-full" />

          <div className="size-9 flex items-center justify-center md:hidden">
            <Menu className="size-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
