import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Note {
  id: string;
  title: string | null;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotes = () => {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
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

export const useAddNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (note: { title?: string; content: string; color?: string }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert([note])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
