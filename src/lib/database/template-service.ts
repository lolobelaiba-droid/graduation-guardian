/**
 * خدمة القوالب - تعمل مع Supabase أو SQLite
 */

import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "./db-client";
import type { 
  CertificateTemplate, 
  TemplateField, 
  TemplateWithFields,
  CertificateType,
  TemplateLanguage 
} from "@/types/certificates";

export class TemplateService {
  /**
   * الحصول على جميع القوالب
   */
  static async getAll(): Promise<{ data: CertificateTemplate[] | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getAll('certificate_templates', 'created_at', 'DESC');
      
      if (result.success && result.data) {
        const templates = (result.data as Array<Record<string, unknown>>).map(t => ({
          ...t,
          is_active: Boolean(t.is_active)
        })) as CertificateTemplate[];
        return { data: templates, error: null };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .order("created_at", { ascending: false });
    
    return { data: data as CertificateTemplate[] | null, error };
  }

  /**
   * الحصول على قالب بالمعرف
   */
  static async getById(id: string): Promise<{ data: CertificateTemplate | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getById('certificate_templates', id);
      
      if (result.success && result.data) {
        const template = result.data as Record<string, unknown>;
        return { 
          data: { ...template, is_active: Boolean(template.is_active) } as CertificateTemplate, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", id)
      .single();
    
    return { data: data as CertificateTemplate | null, error };
  }

  /**
   * الحصول على قالب مع الحقول
   */
  static async getWithFields(id: string): Promise<{ data: TemplateWithFields | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getTemplateWithFields(id);
      
      if (result.success && result.data) {
        const template = result.data as Record<string, unknown>;
        const fields = (template.certificate_template_fields as Array<Record<string, unknown>> || []).map(f => ({
          ...f,
          is_rtl: Boolean(f.is_rtl),
          is_visible: Boolean(f.is_visible)
        }));
        
        return { 
          data: {
            ...template,
            is_active: Boolean(template.is_active),
            certificate_template_fields: fields
          } as TemplateWithFields, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_templates")
      .select(`
        *,
        certificate_template_fields (*)
      `)
      .eq("id", id)
      .single();
    
    return { data: data as TemplateWithFields | null, error };
  }

  /**
   * إنشاء قالب جديد
   */
  static async create(template: { 
    template_name: string; 
    certificate_type: CertificateType; 
    language: TemplateLanguage;
    page_orientation?: string;
  }): Promise<{ data: CertificateTemplate | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.insert('certificate_templates', {
        ...template,
        is_active: 1
      });
      
      if (result.success && result.data) {
        const newTemplate = result.data as Record<string, unknown>;
        await db.insert('activity_log', {
          activity_type: 'template_added',
          description: `تم إنشاء قالب: ${template.template_name}`,
          entity_id: newTemplate.id,
          entity_type: 'template',
        });
        
        return { 
          data: { ...newTemplate, is_active: Boolean(newTemplate.is_active) } as CertificateTemplate, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_templates")
      .insert(template)
      .select()
      .single();
    
    if (data) {
      await supabase.from("activity_log").insert({
        activity_type: "template_added",
        description: `تم إنشاء قالب: ${template.template_name}`,
        entity_id: data.id,
        entity_type: "template",
      });
    }
    
    return { data: data as CertificateTemplate | null, error };
  }

  /**
   * تحديث قالب
   */
  static async update(
    id: string, 
    updates: Partial<CertificateTemplate>
  ): Promise<{ data: CertificateTemplate | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const electronUpdates = {
        ...updates,
        is_active: updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : undefined
      };
      const result = await db.update('certificate_templates', id, electronUpdates);
      
      if (result.success && result.data) {
        const template = result.data as Record<string, unknown>;
        return { 
          data: { ...template, is_active: Boolean(template.is_active) } as CertificateTemplate, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    return { data: data as CertificateTemplate | null, error };
  }

  /**
   * حذف قالب
   */
  static async delete(id: string): Promise<{ error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.delete('certificate_templates', id);
      return { error: result.success ? null : new Error(result.error) };
    }
    
    const { error } = await supabase
      .from("certificate_templates")
      .delete()
      .eq("id", id);
    
    return { error };
  }
}

export class TemplateFieldService {
  /**
   * الحصول على حقول قالب
   */
  static async getByTemplateId(templateId: string): Promise<{ data: TemplateField[] | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getFieldsByTemplateId(templateId);
      
      if (result.success && result.data) {
        const fields = (result.data as Array<Record<string, unknown>>).map(f => ({
          ...f,
          is_rtl: Boolean(f.is_rtl),
          is_visible: Boolean(f.is_visible)
        })) as TemplateField[];
        return { data: fields, error: null };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_template_fields")
      .select("*")
      .eq("template_id", templateId)
      .order("field_order");
    
    return { data: data as TemplateField[] | null, error };
  }

  /**
   * إضافة حقل
   */
  static async create(field: Omit<TemplateField, 'id' | 'created_at'>): Promise<{ data: TemplateField | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const electronField = {
        ...field,
        is_rtl: field.is_rtl ? 1 : 0,
        is_visible: field.is_visible ? 1 : 0
      };
      const result = await db.insert('certificate_template_fields', electronField);
      
      if (result.success && result.data) {
        const newField = result.data as Record<string, unknown>;
        return { 
          data: { ...newField, is_rtl: Boolean(newField.is_rtl), is_visible: Boolean(newField.is_visible) } as TemplateField, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_template_fields")
      .insert(field)
      .select()
      .single();
    
    return { data: data as TemplateField | null, error };
  }

  /**
   * تحديث حقل
   */
  static async update(
    id: string, 
    updates: Partial<TemplateField>
  ): Promise<{ data: TemplateField | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const electronUpdates: Record<string, unknown> = { ...updates };
      if (updates.is_rtl !== undefined) electronUpdates.is_rtl = updates.is_rtl ? 1 : 0;
      if (updates.is_visible !== undefined) electronUpdates.is_visible = updates.is_visible ? 1 : 0;
      
      const result = await db.update('certificate_template_fields', id, electronUpdates);
      
      if (result.success && result.data) {
        const field = result.data as Record<string, unknown>;
        return { 
          data: { ...field, is_rtl: Boolean(field.is_rtl), is_visible: Boolean(field.is_visible) } as TemplateField, 
          error: null 
        };
      }
      
      return { data: null, error: result.error ? new Error(result.error) : null };
    }
    
    const { data, error } = await supabase
      .from("certificate_template_fields")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    return { data: data as TemplateField | null, error };
  }

  /**
   * حذف حقل
   */
  static async delete(id: string): Promise<{ error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.delete('certificate_template_fields', id);
      return { error: result.success ? null : new Error(result.error) };
    }
    
    const { error } = await supabase
      .from("certificate_template_fields")
      .delete()
      .eq("id", id);
    
    return { error };
  }
}
