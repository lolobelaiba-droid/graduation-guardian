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
import { Settings, Plus, Trash2, Loader2, Pencil, Check, X, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDropdownOptions,
  useAddDropdownOption,
  useDeleteDropdownOption,
  useUpdateDropdownOption,
} from "@/hooks/useDropdownOptions";

interface ManageUniversitiesDialogProps {
  trigger?: React.ReactNode;
  onSelect?: (value: string) => void;
}

interface EditingState {
  id: string;
  value: string;
}

export const ManageUniversitiesDialog: React.FC<ManageUniversitiesDialogProps> = ({ trigger, onSelect }) => {
  const { data: universities = [], isLoading } = useDropdownOptions("university");
  const addOption = useAddDropdownOption();
  const deleteOption = useDeleteDropdownOption();
  const updateOption = useUpdateDropdownOption();

  const [isOpen, setIsOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editing, setEditing] = React.useState<EditingState | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filteredUniversities = React.useMemo(() => {
    if (!searchQuery.trim()) return universities;
    const q = searchQuery.toLowerCase();
    return universities.filter(u => u.option_value.toLowerCase().includes(q));
  }, [universities, searchQuery]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    await addOption.mutateAsync({
      optionType: "university",
      optionValue: newValue.trim(),
    });
    setNewValue("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteOption.mutateAsync({ id, optionType: "university" });
    setDeletingId(null);
  };

  const handleEditStart = (id: string, value: string) => {
    setEditing({ id, value });
  };

  const handleEditSave = async () => {
    if (!editing || !editing.value.trim()) return;
    await updateOption.mutateAsync({
      id: editing.id,
      optionType: "university",
      optionValue: editing.value.trim(),
    });
    setEditing(null);
  };

  const handleEditCancel = () => setEditing(null);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleEditSave(); }
    if (e.key === "Escape") handleEditCancel();
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newValue.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="إدارة الجامعات">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إدارة الجامعات</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new university */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1.5">
              <Label htmlFor="newUniversity" className="text-xs">إضافة جامعة جديدة</Label>
              <div className="flex gap-2">
                <Input
                  id="newUniversity"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="اسم الجامعة..."
                  className="text-sm flex-1"
                  dir="auto"
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newValue.trim() || addOption.isPending}
                  size="sm"
                  className="shrink-0"
                >
                  {addOption.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الجامعات..."
              className="text-sm pr-9"
              dir="auto"
            />
          </div>

          {/* Universities list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              الجامعات ({filteredUniversities.length})
            </Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUniversities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "لا توجد نتائج" : "لا توجد جامعات"}
              </p>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-1.5 pl-2">
                  {filteredUniversities.map((uni) => {
                    const isEditing = editing?.id === uni.id;

                    if (isEditing) {
                      return (
                        <div
                          key={uni.id}
                          className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/30"
                        >
                          <Input
                            value={editing.value}
                            onChange={(e) => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={handleEditKeyDown}
                            className="text-xs h-8 flex-1"
                            dir="auto"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={handleEditSave}
                            disabled={updateOption.isPending}
                            title="حفظ"
                          >
                            {updateOption.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={handleEditCancel}
                            title="إلغاء"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={uni.id}
                        className="flex items-center justify-between gap-2 p-2 bg-background rounded-md border hover:border-border/80 group cursor-pointer"
                        onClick={() => {
                          onSelect?.(uni.option_value);
                          setIsOpen(false);
                        }}
                      >
                        <span className="text-sm truncate flex-1" dir="auto">
                          {uni.option_value}
                        </span>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditStart(uni.id, uni.option_value)}
                            title="تعديل"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(uni.id)}
                            disabled={deletingId === uni.id}
                            title="حذف"
                          >
                            {deletingId === uni.id ? (
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
