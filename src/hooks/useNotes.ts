import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isElectron, getDbClient } from '@/lib/database/db-client';
import { toast } from 'sonner';

export interface Note {
  id: string;
  title: string | null;
  content: string;
  color: string;
  is_pinned: boolean;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotes = () => {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('notes', 'updated_at', 'DESC');
        if (result.success) {
          const notes = (result.data || []) as Note[];
          // Sort: pinned first, then by updated_at desc
          return notes.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return (b.updated_at || '').localeCompare(a.updated_at || '');
          });
        }
        return [];
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Note[];
    },
  });
};

export const useUnreadNotesCount = () => {
  return useQuery({
    queryKey: ['notes-unread-count'],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('notes');
        if (result.success) {
          return ((result.data || []) as Note[]).filter(n => !n.is_read).length;
        }
        return 0;
      }

      const { count, error } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
};

export const useMarkAllNotesAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('notes');
        if (result.success) {
          for (const note of (result.data || []) as Note[]) {
            if (!note.is_read) {
              await db.update('notes', note.id, { is_read: true });
            }
          }
        }
        return;
      }

      const { error } = await supabase
        .from('notes')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-unread-count'] });
    },
  });
};

export const useAddNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (note: { title?: string; content: string; color?: string }) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.insert('notes', { ...note, is_read: false, is_pinned: false });
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([{ ...note, is_read: false }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-unread-count'] });
      toast.success('تم إضافة الملاحظة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء إضافة الملاحظة');
      console.error(error);
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.update('notes', id, updates);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-unread-count'] });
      toast.success('تم تحديث الملاحظة');
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء تحديث الملاحظة');
      console.error(error);
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.delete('notes', id);
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-unread-count'] });
      toast.success('تم حذف الملاحظة');
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء حذف الملاحظة');
      console.error(error);
    },
  });
};

export const useTogglePinNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.update('notes', id, { is_pinned: !is_pinned });
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !is_pinned })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      toast.error('حدث خطأ');
      console.error(error);
    },
  });
};

export const useToggleReadNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.update('notes', id, { is_read: !is_read });
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase
        .from('notes')
        .update({ is_read: !is_read })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-unread-count'] });
    },
    onError: (error) => {
      toast.error('حدث خطأ');
      console.error(error);
    },
  });
};
