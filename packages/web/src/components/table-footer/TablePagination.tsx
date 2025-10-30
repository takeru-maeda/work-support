import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "../ui/pagination";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const TablePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: TablePaginationProps) => {
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 0) {
      return [1];
    }

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: (number | string)[] = [1];

    const showStartEllipsis = currentPage > 2;
    const showEndEllipsis = currentPage < totalPages - 1;

    if (currentPage === 1) {
      pages.push("ellipsis-end");
    } else if (currentPage === 2) {
      pages.push(2, "ellipsis-end");
    } else if (currentPage === totalPages - 1) {
      pages.push("ellipsis-start", currentPage, totalPages);
    } else if (currentPage === totalPages) {
      pages.push("ellipsis-start", totalPages);
    } else {
      if (showStartEllipsis) {
        pages.push("ellipsis-start");
      }
      pages.push(currentPage);
      if (showEndEllipsis) {
        pages.push("ellipsis-end");
      }
    }

    if (pages.at(-1) !== totalPages) {
      pages.push(totalPages);
    }

    return pages;
  };
  return (
    <div className={className}>
      <Pagination className="mx-0 w-full">
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
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
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default TablePagination;
