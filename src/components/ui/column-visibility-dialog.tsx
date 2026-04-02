import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnDef } from "@/hooks/useColumnVisibility";

interface ColumnVisibilityDialogProps {
  columns: ColumnDef[];
  visibleColumns: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSelectAll: (visible: boolean) => void;
  onReset: () => void;
  visibleCount: number;
}

export function ColumnVisibilityDialog({
  columns,
  visibleColumns,
  onToggle,
  onSelectAll,
  onReset,
  visibleCount,
}: ColumnVisibilityDialogProps) {
  const toggleableColumns = columns.filter(c => !c.alwaysVisible);
  const allVisible = toggleableColumns.every(c => visibleColumns[c.key] !== false);
  const noneVisible = toggleableColumns.every(c => visibleColumns[c.key] === false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          الأعمدة ({visibleCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>إدارة أعمدة الجدول</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Select all / none */}
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={allVisible}
              onClick={() => onSelectAll(true)}
            >
              تحديد الكل
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={noneVisible}
              onClick={() => onSelectAll(false)}
            >
              إلغاء الكل
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs mr-auto"
              onClick={onReset}
            >
              استعادة الافتراضي
            </Button>
          </div>

          {/* Column list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col.key}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                  col.alwaysVisible ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Checkbox
                  checked={visibleColumns[col.key] !== false}
                  onCheckedChange={() => {
                    if (!col.alwaysVisible) onToggle(col.key);
                  }}
                  disabled={col.alwaysVisible}
                />
                <span className="text-sm">{col.label}</span>
                {col.alwaysVisible && (
                  <span className="text-xs text-muted-foreground mr-auto">(ثابت)</span>
                )}
              </label>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
