import { cn } from "@/lib/utils";
import type { JSX } from "react";
import TablePagination from "./TablePagination";
import PageSizeSelect from "./PageSizeSelect";

interface TableFooterProps {
  itemCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  itemsPerPageOptions?: number[];
  className?: string;
  showItemCount?: boolean;
}

export function TableFooter({
  itemCount,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
  className,
  showItemCount = true,
}: Readonly<TableFooterProps>): JSX.Element {
  return (
    <>
      {/* モバイル */}
      <div className={cn("sm:hidden", className)}>
        <div className="flex w-full items-center justify-between">
          {showItemCount && (
            <div className="ml-2 text-sm text-muted-foreground">
              {itemCount}件
            </div>
          )}

          <PageSizeSelect
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            itemsPerPageOptions={itemsPerPageOptions}
          />
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          className="mt-1"
        />
      </div>

      {/* デスクトップ */}
      <div className={cn("hidden sm:block", className)}>
        <div className="flex w-full items-center justify-between gap-4">
          {showItemCount && (
            <div className="ml-2 text-sm text-muted-foreground">
              {itemCount}件
            </div>
          )}

          <div className="flex items-center gap-4">
            <PageSizeSelect
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={onItemsPerPageChange}
              itemsPerPageOptions={itemsPerPageOptions}
            />

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}
