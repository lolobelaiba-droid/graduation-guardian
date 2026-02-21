import { useState, useCallback, useEffect, useRef } from "react";

interface UseResizableColumnsOptions {
  storageKey: string;
  defaultWidths: Record<string, number>;
  minWidth?: number;
}

export function useResizableColumns({
  storageKey,
  defaultWidths,
  minWidth = 40,
}: UseResizableColumnsOptions) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new columns
        return { ...defaultWidths, ...parsed };
      }
    } catch {}
    return { ...defaultWidths };
  });

  const dragRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (columnKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        columnKey,
        startX: e.clientX,
        startWidth: widths[columnKey] || defaultWidths[columnKey] || 100,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        // RTL: dragging left increases width
        const diff = dragRef.current.startX - ev.clientX;
        const newWidth = Math.max(minWidth, dragRef.current.startWidth + diff);
        setWidths((prev) => {
          const updated = { ...prev, [dragRef.current!.columnKey]: newWidth };
          return updated;
        });
      };

      const handleMouseUp = () => {
        if (dragRef.current) {
          // Save to localStorage on release
          setWidths((prev) => {
            try {
              localStorage.setItem(storageKey, JSON.stringify(prev));
            } catch {}
            return prev;
          });
        }
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [widths, defaultWidths, minWidth, storageKey]
  );

  const resetWidths = useCallback(() => {
    setWidths({ ...defaultWidths });
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [defaultWidths, storageKey]);

  const getHeaderProps = useCallback(
    (columnKey: string) => ({
      style: { width: `${widths[columnKey] || defaultWidths[columnKey] || 100}px` } as React.CSSProperties,
    }),
    [widths, defaultWidths]
  );

  const getResizeHandle = useCallback(
    (columnKey: string) => ({
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(columnKey, e),
    }),
    [handleMouseDown]
  );

  return { widths, getHeaderProps, getResizeHandle, resetWidths };
}
