import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  children,
  className,
}: Readonly<PageContainerProps>) {
  return (
    <div
      className={cn(
        "container mx-auto px-3 sm:px-8 md:px-10 lg:px-12 py-6 sm:py-8 max-w-5xl overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
