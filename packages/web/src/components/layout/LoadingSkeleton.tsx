import { Skeleton } from "@/components/ui/skeleton";
import { AppHeaderHomeLink } from "@/components/layout/header/AppHeaderHomeLink";
import { Menu } from "lucide-react";
import { PageContainer } from "../shared/PageContainer";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
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

      {/* コンテンツエリアスケルトン */}
      <PageContainer>
        <div className="mb-6 sm:mb-8 space-y-6">
          {/* タイトルスケルトン */}
          <div className="space-y-2">
            <Skeleton className="h-10 sm:h-12 w-48" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>

          {/* カードグリッドスケルトン */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            ))}
          </div>

          {/* テーブルスケルトン */}
          <div className="rounded-lg border bg-card">
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
