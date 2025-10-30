import type { JSX, ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FilterAccordionProps {
  children: ReactNode;
  title?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  value?: string;
}

export function FilterAccordion({
  children,
  title = "絞り込み条件",
  className,
  triggerClassName,
  contentClassName,
  value = "filters",
}: Readonly<FilterAccordionProps>): JSX.Element {
  return (
    <div className={cn("border rounded-lg", className)}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={value}>
          <AccordionTrigger
            className={cn("px-4 hover:no-underline", triggerClassName)}
          >
            <span className="text-sm font-medium">{title}</span>
          </AccordionTrigger>
          <AccordionContent className={cn("px-4 pb-4", contentClassName)}>
            {children}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
