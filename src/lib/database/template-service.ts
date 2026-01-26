/**
 * خدمة القوالب - تعمل مع Supabase أو SQLite
 */

import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient, wrapElectronResult, wrapElectronListResult } from "./db-client";
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
      
      // تحويل القيم المنطقية
      if (result.success && result.data) {
        result.data = result.data.map((t: Record<string, unknown>) => ({
          ...t,
          is_active: Boolean(t.is_active)
        }));
      }
      
      return wrapElectronListResult(result);
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
        result.data.is_active = Boolean(result.data.is_active);
      }
      
      return wrapElectronResult(result);
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
        result.data.is_active = Boolean(result.data.is_active);
        result.data.certificate_template_fields = result.data.certificate_template_fields?.map(
          (f: Record<string, unknown>) => ({
            ...f,
            is_rtl: Boolean(f.is_rtl),
            is_visible: Boolean(f.is_visible)
          })
        ) || [];
      }
      
      return wrapElectronResult(result);
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
      
      if (result.success) {
        await db.insert('activity_log', {
          activity_type: 'template_added',
          description: `تم إنشاء قالب: ${template.template_name}`,
          entity_id: result.data.id,
          entity_type: 'template',
        });
        
        result.data.is_active = Boolean(result.data.is_active);
      }
      
      return wrapElectronResult(result);
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
        result.data.is_active = Boolean(result.data.is_active);
      }
      
      return wrapElectronResult(result);
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
        result.data = result.data.map((f: Record<string, unknown>) => ({
          ...f,
          is_rtl: Boolean(f.is_rtl),
          is_visible: Boolean(f.is_visible)
        }));
      }
      
      return wrapElectronListResult(result);
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
        result.data.is_rtl = Boolean(result.data.is_rtl);
        result.data.is_visible = Boolean(result.data.is_visible);
      }
      
      return wrapElectronResult(result);
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
        result.data.is_rtl = Boolean(result.data.is_rtl);
        result.data.is_visible = Boolean(result.data.is_visible);
      }
      
      return wrapElectronResult(result);
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
