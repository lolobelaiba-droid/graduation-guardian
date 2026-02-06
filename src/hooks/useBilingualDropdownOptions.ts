import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BilingualOptionType = 'employment_status' | 'registration_type' | 'inscription_status';

export interface BilingualOption {
  id: string;
  option_type: string;
  option_value: string;
  value_ar: string | null;
  value_fr: string | null;
  display_order: number;
  created_at: string;
}

export function useBilingualDropdownOptions(optionType: BilingualOptionType) {
  return useQuery({
    queryKey: ['bilingual_dropdown_options', optionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('option_type', optionType)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as BilingualOption[];
    },
  });
}

export function useAddBilingualOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      optionType, 
      optionValue, 
      valueAr, 
      valueFr 
    }: { 
      optionType: BilingualOptionType; 
      optionValue: string;
      valueAr: string;
      valueFr: string;
    }) => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .insert({
          option_type: optionType,
          option_value: optionValue.trim(),
          value_ar: valueAr.trim(),
          value_fr: valueFr.trim(),
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
      queryClient.invalidateQueries({ queryKey: ['bilingual_dropdown_options', variables.optionType] });
      toast.success('تمت إضافة الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إضافة الخيار');
    },
  });
}

export function useDeleteBilingualOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, optionType }: { id: string; optionType: BilingualOptionType }) => {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, optionType };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['bilingual_dropdown_options', variables.optionType] });
      toast.success('تم حذف الخيار بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الخيار');
    },
  });
}

export function useUpdateBilingualOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      optionType, 
      optionValue,
      valueAr,
      valueFr,
    }: { 
      id: string; 
      optionType: BilingualOptionType; 
      optionValue: string;
      valueAr: string;
      valueFr: string;
    }) => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .update({ 
          option_value: optionValue.trim(),
          value_ar: valueAr.trim(),
          value_fr: valueFr.trim(),
        })
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
      queryClient.invalidateQueries({ queryKey: ['bilingual_dropdown_options', variables.optionType] });
      toast.success('تم تعديل الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تعديل الخيار');
    },
  });
}
