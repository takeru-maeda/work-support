import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthPageContainerProps {
  children: ReactNode;
  className?: string;
}

export function AuthPageContainer({
  children,
  className,
}: Readonly<AuthPageContainerProps>) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-start justify-center bg-background px-15 sm:px-4 pt-5",
        className,
      )}
    >
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  );
}
