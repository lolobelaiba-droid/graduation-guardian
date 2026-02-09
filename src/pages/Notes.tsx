import { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Pin, 
  PinOff, 
  Sparkles, 
  StickyNote, 
  Edit3,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNotes, useAddNote, useUpdateNote, useDeleteNote, useTogglePinNote, type Note } from "@/hooks/useNotes";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const noteColors = [
  { name: "default", bg: "bg-card", border: "border-border" },
  { name: "yellow", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800" },
  { name: "green", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  { name: "blue", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
  { name: "purple", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
  { name: "pink", bg: "bg-pink-50 dark:bg-pink-900/20", border: "border-pink-200 dark:border-pink-800" },
];

const getColorClasses = (colorName: string) => {
  return noteColors.find(c => c.name === colorName) || noteColors[0];
};

export default function Notes() {
  const { data: notes = [], isLoading } = useNotes();
  const addNote = useAddNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePinNote();

  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", color: "default" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", content: "" });

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;
    addNote.mutate(newNote, {
      onSuccess: () => {
        setNewNote({ title: "", content: "", color: "default" });
        setIsAdding(false);
      }
    });
  };

  const handleUpdateNote = (id: string) => {
    updateNote.mutate({ id, ...editData }, {
      onSuccess: () => {
        setEditingId(null);
        setEditData({ title: "", content: "" });
      }
    });
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditData({ title: note.title || "", content: note.content });
  };

  const pinnedNotes = notes.filter(n => n.is_pinned);
  const unpinnedNotes = notes.filter(n => !n.is_pinned);

  return (
    <div className="space-y-6">
      {/* Header with exciting design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                سجل الملاحظات
                <span className="text-lg animate-bounce">✨</span>
              </h1>
              <p className="text-primary-foreground/80 mt-1">
                دوّن أفكارك وملاحظاتك المهمة لتتذكرها دائماً
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/20 gap-2 transition-all hover:scale-105"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            ملاحظة جديدة
          </Button>
        </div>
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <div className="bg-card rounded-2xl shadow-elevated p-6 border animate-scale-in">
          <div className="space-y-4">
            <Input
              placeholder="عنوان الملاحظة (اختياري)"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="text-lg font-semibold border-none bg-muted/50 focus-visible:ring-primary"
            />
            <Textarea
              placeholder="اكتب ملاحظتك هنا..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="min-h-[120px] resize-none border-none bg-muted/50 focus-visible:ring-primary"
            />
            
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">اللون:</span>
              <div className="flex gap-2">
                {noteColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setNewNote({ ...newNote, color: color.name })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      color.bg,
                      color.border,
                      newNote.color === color.name && "ring-2 ring-primary ring-offset-2"
                    )}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.content.trim() || addNote.isPending}
                className="gap-2"
              >
                {addNote.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                حفظ الملاحظة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes.length === 0 && !isAdding && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <div className="p-6 bg-muted/30 rounded-full mb-4 animate-pulse">
            <StickyNote className="h-12 w-12 opacity-50" />
          </div>
          <p className="text-lg font-medium">لا توجد ملاحظات بعد</p>
          <p className="text-sm">ابدأ بإضافة ملاحظة جديدة لتنظيم أفكارك</p>
          <Button 
            className="mt-4 gap-2" 
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
            أضف ملاحظة
          </Button>
        </div>
      )}

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <Pin className="h-4 w-4" />
            الملاحظات المثبتة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                index={index}
                isEditing={editingId === note.id}
                editData={editData}
                setEditData={setEditData}
                onEdit={() => startEditing(note)}
                onSave={() => handleUpdateNote(note.id)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteNote.mutate(note.id)}
                onTogglePin={() => togglePin.mutate({ id: note.id, is_pinned: note.is_pinned })}
                isPending={updateNote.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Notes */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
              <StickyNote className="h-4 w-4" />
              الملاحظات الأخرى
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpinnedNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                index={index}
                isEditing={editingId === note.id}
                editData={editData}
                setEditData={setEditData}
                onEdit={() => startEditing(note)}
                onSave={() => handleUpdateNote(note.id)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteNote.mutate(note.id)}
                onTogglePin={() => togglePin.mutate({ id: note.id, is_pinned: note.is_pinned })}
                isPending={updateNote.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  index: number;
  isEditing: boolean;
  editData: { title: string; content: string };
  setEditData: (data: { title: string; content: string }) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  isPending: boolean;
}

function NoteCard({ 
  note, 
  index, 
  isEditing, 
  editData, 
  setEditData, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  onTogglePin,
  isPending
}: NoteCardProps) {
  const colorClasses = getColorClasses(note.color);
  
  return (
    <div
      className={cn(
        "group rounded-xl border p-4 transition-all duration-300 hover:shadow-elevated animate-fade-in",
        colorClasses.bg,
        colorClasses.border,
        note.is_pinned && "ring-2 ring-primary/20"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder="العنوان"
            className="font-semibold"
          />
          <Textarea
            value={editData.content}
            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
            className="min-h-[100px] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            {note.title && (
              <h3 className="font-semibold text-foreground line-clamp-1">{note.title}</h3>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={onTogglePin}
              >
                {note.is_pinned ? (
                  <PinOff className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={onEdit}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap line-clamp-4">
            {note.content}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-3">
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ar })}
          </p>
        </>
      )}
    </div>
  );
}

