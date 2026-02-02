import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AcademicTitle {
  id: string;
  full_name: string;
  abbreviation: string;
  display_order: number;
  created_at: string;
}

export const useAcademicTitles = () => {
  const [titles, setTitles] = useState<AcademicTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTitles = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("academic_titles")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTitles(data || []);
    } catch (error) {
      console.error("Error fetching academic titles:", error);
      toast.error("فشل في تحميل الرتب العلمية");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTitle = useCallback(async (fullName: string, abbreviation: string) => {
    try {
      const maxOrder = titles.length > 0 
        ? Math.max(...titles.map(t => t.display_order)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("academic_titles")
        .insert({
          full_name: fullName,
          abbreviation: abbreviation,
          display_order: maxOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setTitles(prev => [...prev, data]);
      toast.success("تم إضافة الرتبة بنجاح");
      return data;
    } catch (error) {
      console.error("Error adding academic title:", error);
      toast.error("فشل في إضافة الرتبة");
      return null;
    }
  }, [titles]);

  const deleteTitle = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("academic_titles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTitles(prev => prev.filter(t => t.id !== id));
      toast.success("تم حذف الرتبة بنجاح");
      return true;
    } catch (error) {
      console.error("Error deleting academic title:", error);
      toast.error("فشل في حذف الرتبة");
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTitles();
  }, [fetchTitles]);

  return {
    titles,
    isLoading,
    addTitle,
    deleteTitle,
    refetch: fetchTitles,
  };
};
