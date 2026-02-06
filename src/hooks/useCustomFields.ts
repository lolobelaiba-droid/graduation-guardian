import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
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
  options?: string[];
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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('custom_fields', 'display_order', 'ASC');
        if (result.success) {
          let fields = (result.data || []) as CustomField[];
          if (targetTable) {
            fields = fields.filter(f => f.target_table === targetTable);
          }
          return fields;
        }
        return [];
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('custom_field_options', 'display_order', 'ASC');
        if (result.success) {
          return ((result.data || []) as CustomFieldOption[]).filter(o => o.field_id === fieldId);
        }
        return [];
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('custom_field_options', 'display_order', 'ASC');
        if (result.success) {
          return (result.data || []) as CustomFieldOption[];
        }
        return [];
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('custom_field_values');
        if (result.success) {
          return ((result.data || []) as CustomFieldValue[]).filter(
            v => v.record_id === recordId && v.record_type === recordType
          );
        }
        return [];
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.insert('custom_fields', {
          field_key: input.field_key,
          field_name_ar: input.field_name_ar,
          field_name_fr: input.field_name_fr || null,
          field_type: input.field_type,
          target_table: input.target_table,
          is_required: input.is_required ?? false,
          is_active: true,
          display_order: input.display_order ?? 0,
        });
        if (!result.success) throw new Error(result.error);

        const field = result.data as CustomField;

        if (input.field_type === "select" && input.options && input.options.length > 0) {
          for (let idx = 0; idx < input.options.length; idx++) {
            await db.insert('custom_field_options', {
              field_id: field.id,
              option_value: input.options[idx],
              display_order: idx,
            });
          }
        }

        return field;
      }

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

      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.update('custom_fields', id, updates);
        if (!result.success) throw new Error(result.error);
        return result.data as CustomField;
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        // Delete related values and options first
        const allValues = await db.getAll('custom_field_values');
        if (allValues.success && allValues.data) {
          for (const v of (allValues.data as CustomFieldValue[])) {
            if (v.field_id === fieldId) {
              await db.delete('custom_field_values', v.id);
            }
          }
        }
        const allOptions = await db.getAll('custom_field_options');
        if (allOptions.success && allOptions.data) {
          for (const o of (allOptions.data as CustomFieldOption[])) {
            if (o.field_id === fieldId) {
              await db.delete('custom_field_options', o.id);
            }
          }
        }
        const result = await db.delete('custom_fields', fieldId);
        if (!result.success) throw new Error(result.error);
        return;
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        // Delete existing options for this field
        const allOptions = await db.getAll('custom_field_options');
        if (allOptions.success && allOptions.data) {
          for (const o of (allOptions.data as CustomFieldOption[])) {
            if (o.field_id === fieldId) {
              await db.delete('custom_field_options', o.id);
            }
          }
        }
        // Insert new options
        for (let idx = 0; idx < options.length; idx++) {
          await db.insert('custom_field_options', {
            field_id: fieldId,
            option_value: options[idx],
            display_order: idx,
          });
        }
        return;
      }

      await supabase
        .from("custom_field_options")
        .delete()
        .eq("field_id", fieldId);

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
      if (isElectron()) {
        const db = getDbClient()!;
        // Find existing value
        const allValues = await db.getAll('custom_field_values');
        let existing: CustomFieldValue | undefined;
        if (allValues.success && allValues.data) {
          existing = (allValues.data as CustomFieldValue[]).find(
            v => v.field_id === fieldId && v.record_id === recordId && v.record_type === recordType
          );
        }

        if (existing) {
          const result = await db.update('custom_field_values', existing.id, { value });
          if (!result.success) throw new Error(result.error);
          return result.data;
        } else {
          const result = await db.insert('custom_field_values', {
            field_id: fieldId,
            record_id: recordId,
            record_type: recordType,
            value,
          });
          if (!result.success) throw new Error(result.error);
          return result.data;
        }
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const allValues = await db.getAll('custom_field_values');
        const existingValues = (allValues.success ? allValues.data : []) as CustomFieldValue[];

        for (const v of values) {
          const existing = existingValues.find(
            ev => ev.field_id === v.fieldId && ev.record_id === v.recordId && ev.record_type === v.recordType
          );

          if (existing) {
            await db.update('custom_field_values', existing.id, { value: v.value });
          } else {
            await db.insert('custom_field_values', {
              field_id: v.fieldId,
              record_id: v.recordId,
              record_type: v.recordType,
              value: v.value,
            });
          }
        }
        return;
      }

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
