import React from "react";

import { cn } from "@/lib/utils";

interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
}

const CardContainer = ({ children, className }: CardContainerProps) => {
  return (
    <div
      className={cn(
        "w-full max-w-full overflow-hidden rounded-lg border border-border text-card-foreground shadow-sm p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default CardContainer;
