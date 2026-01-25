import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OptionType = 'faculty' | 'field_ar' | 'field_fr';

interface DropdownOption {
  id: string;
  option_type: OptionType;
  option_value: string;
  display_order: number;
  created_at: string;
}

export function useDropdownOptions(optionType: OptionType) {
  return useQuery({
    queryKey: ['dropdown_options', optionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('option_type', optionType)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as DropdownOption[];
    },
  });
}

export function useAddDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ optionType, optionValue }: { optionType: OptionType; optionValue: string }) => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .insert({
          option_type: optionType,
          option_value: optionValue.trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا الخيار موجود مسبقاً');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown_options', variables.optionType] });
      toast.success('تمت إضافة الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إضافة الخيار');
    },
  });
}

export function useDeleteDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, optionType }: { id: string; optionType: OptionType }) => {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, optionType };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown_options', variables.optionType] });
      toast.success('تم حذف الخيار بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الخيار');
    },
  });
}

export function useUpdateDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, optionType, optionValue }: { id: string; optionType: OptionType; optionValue: string }) => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .update({ option_value: optionValue.trim() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا الخيار موجود مسبقاً');
        }
        throw error;
      }
      return { data, optionType };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown_options', variables.optionType] });
      toast.success('تم تعديل الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تعديل الخيار');
    },
  });
}
