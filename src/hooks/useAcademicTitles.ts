import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
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

      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('academic_titles', 'display_order', 'ASC');
        if (result.success) {
          setTitles((result.data || []) as AcademicTitle[]);
        }
        return;
      }

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

      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.insert('academic_titles', {
          full_name: fullName,
          abbreviation: abbreviation,
          display_order: maxOrder,
        });
        if (!result.success) throw new Error(result.error);
        const newTitle = result.data as AcademicTitle;
        setTitles(prev => [...prev, newTitle]);
        toast.success("تم إضافة الرتبة بنجاح");
        return newTitle;
      }

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

  const updateTitle = useCallback(async (id: string, fullName: string, abbreviation: string) => {
    try {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.update('academic_titles', id, {
          full_name: fullName,
          abbreviation: abbreviation,
        });
        if (!result.success) throw new Error(result.error);
        setTitles(prev => prev.map(t => t.id === id ? { ...t, full_name: fullName, abbreviation } : t));
        toast.success("تم تعديل الرتبة بنجاح");
        return true;
      }

      const { error } = await supabase
        .from("academic_titles")
        .update({ full_name: fullName, abbreviation })
        .eq("id", id);

      if (error) throw error;

      setTitles(prev => prev.map(t => t.id === id ? { ...t, full_name: fullName, abbreviation } : t));
      toast.success("تم تعديل الرتبة بنجاح");
      return true;
    } catch (error) {
      console.error("Error updating academic title:", error);
      toast.error("فشل في تعديل الرتبة");
      return false;
    }
  }, []);

  const deleteTitle = useCallback(async (id: string) => {
    try {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.delete('academic_titles', id);
        if (!result.success) throw new Error(result.error);
        setTitles(prev => prev.filter(t => t.id !== id));
        toast.success("تم حذف الرتبة بنجاح");
        return true;
      }

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
    updateTitle,
    deleteTitle,
    refetch: fetchTitles,
  };
};
