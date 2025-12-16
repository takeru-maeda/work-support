import { useEffect, useRef, useState } from "react";

interface UseTableResizeOptions {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

interface UseTableResizeResult {
  tableHeight: number;
  isResizing: boolean;
  handleResizeStart: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const DEFAULT_OPTIONS: Required<UseTableResizeOptions> = {
  initialHeight: 320,
  minHeight: 240,
  maxHeight: 720,
};

/**
 * テーブルの高さをドラッグでリサイズする機能を提供します。
 *
 * @param options リサイズオプション
 * @returns テーブル高さとリサイズ操作用ハンドラ
 */
export function useTableResize(
  options: UseTableResizeOptions = {},
): UseTableResizeResult {
  const { initialHeight, minHeight, maxHeight } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const [tableHeight, setTableHeight] = useState<number>(initialHeight);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeStartYRef = useRef<number>(0);
  const resizeStartHeightRef = useRef<number>(initialHeight);

  const handleResizeStart = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();
    setIsResizing(true);
    resizeStartYRef.current = event.clientY;
    resizeStartHeightRef.current = tableHeight;
  };

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaY = event.clientY - resizeStartYRef.current;
      const nextHeight = resizeStartHeightRef.current + deltaY;
      const constrainedHeight = Math.max(
        minHeight,
        Math.min(maxHeight, nextHeight),
      );
      setTableHeight(constrainedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing, maxHeight, minHeight, tableHeight]);

  return {
    tableHeight,
    isResizing,
    handleResizeStart,
  };
}
