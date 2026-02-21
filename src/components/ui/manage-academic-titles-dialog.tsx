import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademicTitles, AcademicTitle } from "@/hooks/useAcademicTitles";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManageAcademicTitlesDialogProps {
  trigger?: React.ReactNode;
  onTitlesChange?: () => void;
}

interface EditingState {
  id: string;
  fullName: string;
  abbreviation: string;
}

export const ManageAcademicTitlesDialog: React.FC<ManageAcademicTitlesDialogProps> = ({ trigger, onTitlesChange }) => {
  const { titles, isLoading, addTitle, updateTitle, deleteTitle } = useAcademicTitles();
  const [isOpen, setIsOpen] = React.useState(false);
  const [newFullName, setNewFullName] = React.useState("");
  const [newAbbreviation, setNewAbbreviation] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<EditingState | null>(null);

  const handleAdd = async () => {
    if (!newFullName.trim() || !newAbbreviation.trim()) return;
    setIsAdding(true);
    const result = await addTitle(newFullName.trim(), newAbbreviation.trim());
    if (result) {
      setNewFullName("");
      setNewAbbreviation("");
      onTitlesChange?.();
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteTitle(id);
    if (success) onTitlesChange?.();
    setDeletingId(null);
  };

  const handleEditStart = (title: AcademicTitle) => {
    setEditing({ id: title.id, fullName: title.full_name, abbreviation: title.abbreviation });
  };

  const handleEditCancel = () => setEditing(null);

  const handleEditSave = async () => {
    if (!editing || !editing.fullName.trim() || !editing.abbreviation.trim()) return;
    setSavingId(editing.id);
    const success = await updateTitle(editing.id, editing.fullName.trim(), editing.abbreviation.trim());
    if (success) onTitlesChange?.();
    setSavingId(null);
    setEditing(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleEditSave(); }
    if (e.key === "Escape") handleEditCancel();
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newFullName.trim() && newAbbreviation.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:text-primary transition-colors"
            title="إدارة الرتب العلمية"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إدارة الرتب العلمية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new title form */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="مثال: أستاذ التعليم العالي"
                  className="text-sm"
                  dir="auto"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="abbreviation" className="text-xs">الاختصار</Label>
                <Input
                  id="abbreviation"
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="مثال: أد / Pr"
                  className="text-sm"
                  dir="auto"
                />
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newFullName.trim() || !newAbbreviation.trim() || isAdding}
              size="sm"
              className="w-full"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
              إضافة رتبة
            </Button>
          </div>

          {/* Existing titles list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">الرتب الحالية</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : titles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد رتب علمية</p>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="space-y-2 pl-2">
                  {titles.map((title) => {
                    const isEditing = editing?.id === title.id;
                    const isSaving = savingId === title.id;

                    if (isEditing) {
                      return (
                        <div
                          key={title.id}
                          className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/30"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                              value={editing.abbreviation}
                              onChange={(e) => setEditing(prev => prev ? { ...prev, abbreviation: e.target.value } : null)}
                              onKeyDown={handleEditKeyDown}
                              className="text-xs h-7 w-20 shrink-0 font-medium"
                              dir="auto"
                              autoFocus
                            />
                            <Input
                              value={editing.fullName}
                              onChange={(e) => setEditing(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                              onKeyDown={handleEditKeyDown}
                              className="text-xs h-7 flex-1 min-w-0"
                              dir="auto"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={handleEditSave}
                              disabled={isSaving || !editing.fullName.trim() || !editing.abbreviation.trim()}
                              title="حفظ"
                            >
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={handleEditCancel}
                              title="إلغاء"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={title.id}
                        className="flex items-center justify-between gap-2 p-2 bg-background rounded-md border hover:border-border/80 group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium shrink-0">
                            {title.abbreviation}
                          </span>
                          <span className="text-sm truncate text-muted-foreground">{title.full_name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditStart(title)}
                            title="تعديل"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(title.id)}
                            disabled={deletingId === title.id}
                            title="حذف"
                          >
                            {deletingId === title.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
