import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PastGoalsPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
}

export function PastGoalsPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: Readonly<PastGoalsPaginationProps>) {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis-start");
    }

    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-end");
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex w-full items-center justify-end gap-4">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
          表示件数:
        </span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={onItemsPerPageChange}
        >
          <SelectTrigger className="w-[80px] sm:w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5件</SelectItem>
            <SelectItem value="10">10件</SelectItem>
            <SelectItem value="20">20件</SelectItem>
            <SelectItem value="50">50件</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>

          {getPageNumbers().map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {typeof page === "number" ? (
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={currentPage === page}
                  className={cn(
                    "cursor-pointer",
                    currentPage === page &&
                      "border-0 bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  )}
                >
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
