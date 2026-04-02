import { useState, useCallback } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
  alwaysVisible?: boolean; // e.g. actions column
}

export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults for new columns
        const result: Record<string, boolean> = {};
        for (const col of columns) {
          if (col.alwaysVisible) {
            result[col.key] = true;
          } else if (col.key in parsed) {
            result[col.key] = parsed[col.key];
          } else {
            result[col.key] = col.defaultVisible !== false;
          }
        }
        return result;
      }
    } catch {}
    const result: Record<string, boolean> = {};
    for (const col of columns) {
      result[col.key] = col.defaultVisible !== false;
    }
    return result;
  });

  const isVisible = useCallback((key: string) => visibleColumns[key] !== false, [visibleColumns]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [storageKey]);

  const setAllVisible = useCallback((visible: boolean) => {
    setVisibleColumns(prev => {
      const updated: Record<string, boolean> = {};
      for (const col of columns) {
        updated[col.key] = col.alwaysVisible ? true : visible;
      }
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [columns, storageKey]);

  const resetToDefaults = useCallback(() => {
    const result: Record<string, boolean> = {};
    for (const col of columns) {
      result[col.key] = col.defaultVisible !== false;
    }
    setVisibleColumns(result);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [columns, storageKey]);

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  return { visibleColumns, isVisible, toggleColumn, setAllVisible, resetToDefaults, visibleCount };
}
