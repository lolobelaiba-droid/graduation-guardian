import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FieldType = "text" | "number" | "date" | "select";
export type TargetTable = "phd_candidates" | "defended_students";

export interface CustomField {
  id: string;
  field_key: string;
  field_name_ar: string;
  field_name_fr: string | null;
  field_type: FieldType;
  target_table: TargetTable;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldOption {
  id: string;
  field_id: string;
  option_value: string;
  display_order: number;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  field_id: string;
  record_id: string;
  record_type: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomFieldInput {
  field_key: string;
  field_name_ar: string;
  field_name_fr?: string | null;
  field_type: FieldType;
  target_table: TargetTable;
  is_required?: boolean;
  display_order?: number;
  options?: string[]; // For select type
}

export interface UpdateCustomFieldInput {
  id: string;
  field_name_ar?: string;
  field_name_fr?: string | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

// Fetch all custom fields
export function useCustomFields(targetTable?: TargetTable) {
  return useQuery({
    queryKey: ["custom-fields", targetTable],
    queryFn: async () => {
      let query = supabase
        .from("custom_fields")
        .select("*")
        .order("display_order", { ascending: true });

      if (targetTable) {
        query = query.eq("target_table", targetTable);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomField[];
    },
  });
}

// Fetch options for a specific field
export function useCustomFieldOptions(fieldId: string) {
  return useQuery({
    queryKey: ["custom-field-options", fieldId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_options")
        .select("*")
        .eq("field_id", fieldId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CustomFieldOption[];
    },
    enabled: !!fieldId,
  });
}

// Fetch all options for multiple fields at once
export function useAllCustomFieldOptions() {
  return useQuery({
    queryKey: ["custom-field-options-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_options")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CustomFieldOption[];
    },
  });
}

// Fetch custom field values for a specific record
export function useCustomFieldValues(recordId: string, recordType: string) {
  return useQuery({
    queryKey: ["custom-field-values", recordId, recordType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_values")
        .select("*")
        .eq("record_id", recordId)
        .eq("record_type", recordType);

      if (error) throw error;
      return data as CustomFieldValue[];
    },
    enabled: !!recordId && !!recordType,
  });
}

// Create a new custom field
export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomFieldInput) => {
      // Create the field
      const { data: field, error: fieldError } = await supabase
        .from("custom_fields")
        .insert({
          field_key: input.field_key,
          field_name_ar: input.field_name_ar,
          field_name_fr: input.field_name_fr,
          field_type: input.field_type,
          target_table: input.target_table,
          is_required: input.is_required ?? false,
          display_order: input.display_order ?? 0,
        })
        .select()
        .single();

      if (fieldError) throw fieldError;

      // If it's a select field, create options
      if (input.field_type === "select" && input.options && input.options.length > 0) {
        const optionsToInsert = input.options.map((opt, idx) => ({
          field_id: field.id,
          option_value: opt,
          display_order: idx,
        }));

        const { error: optionsError } = await supabase
          .from("custom_field_options")
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      return field as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["custom-field-options-all"] });
      toast.success("تم إنشاء الحقل بنجاح");
    },
    onError: (error: Error) => {
      console.error("Error creating custom field:", error);
      if (error.message?.includes("unique")) {
        toast.error("مفتاح الحقل موجود مسبقاً");
      } else {
        toast.error("حدث خطأ أثناء إنشاء الحقل");
      }
    },
  });
}

// Update a custom field
export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCustomFieldInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("custom_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast.success("تم تحديث الحقل بنجاح");
    },
    onError: (error: Error) => {
      console.error("Error updating custom field:", error);
      toast.error("حدث خطأ أثناء تحديث الحقل");
    },
  });
}

// Delete a custom field
export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["custom-field-options-all"] });
      queryClient.invalidateQueries({ queryKey: ["custom-field-values"] });
      toast.success("تم حذف الحقل بنجاح");
    },
    onError: (error: Error) => {
      console.error("Error deleting custom field:", error);
      toast.error("حدث خطأ أثناء حذف الحقل");
    },
  });
}

// Add/update custom field options
export function useUpdateFieldOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, options }: { fieldId: string; options: string[] }) => {
      // Delete existing options
      await supabase
        .from("custom_field_options")
        .delete()
        .eq("field_id", fieldId);

      // Insert new options
      if (options.length > 0) {
        const optionsToInsert = options.map((opt, idx) => ({
          field_id: fieldId,
          option_value: opt,
          display_order: idx,
        }));

        const { error } = await supabase
          .from("custom_field_options")
          .insert(optionsToInsert);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-options"] });
      queryClient.invalidateQueries({ queryKey: ["custom-field-options-all"] });
      toast.success("تم تحديث خيارات الحقل بنجاح");
    },
    onError: (error: Error) => {
      console.error("Error updating field options:", error);
      toast.error("حدث خطأ أثناء تحديث الخيارات");
    },
  });
}

// Save custom field value for a record
export function useSaveCustomFieldValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fieldId,
      recordId,
      recordType,
      value,
    }: {
      fieldId: string;
      recordId: string;
      recordType: string;
      value: string | null;
    }) => {
      const { data, error } = await supabase
        .from("custom_field_values")
        .upsert(
          {
            field_id: fieldId,
            record_id: recordId,
            record_type: recordType,
            value,
          },
          { onConflict: "field_id,record_id,record_type" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", variables.recordId, variables.recordType],
      });
    },
    onError: (error: Error) => {
      console.error("Error saving custom field value:", error);
      toast.error("حدث خطأ أثناء حفظ القيمة");
    },
  });
}

// Bulk save custom field values
export function useBulkSaveCustomFieldValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Array<{
      fieldId: string;
      recordId: string;
      recordType: string;
      value: string | null;
    }>) => {
      const valuesToUpsert = values.map((v) => ({
        field_id: v.fieldId,
        record_id: v.recordId,
        record_type: v.recordType,
        value: v.value,
      }));

      const { error } = await supabase
        .from("custom_field_values")
        .upsert(valuesToUpsert, { onConflict: "field_id,record_id,record_type" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-values"] });
    },
    onError: (error: Error) => {
      console.error("Error saving custom field values:", error);
      toast.error("حدث خطأ أثناء حفظ القيم");
    },
  });
}
