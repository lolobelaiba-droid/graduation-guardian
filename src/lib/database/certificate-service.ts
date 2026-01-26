/**
 * خدمة الشهادات - تعمل مع Supabase أو SQLite
 */

import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "./db-client";
import type { 
  PhdLmdCertificate, 
  PhdScienceCertificate, 
  MasterCertificate,
  CertificateType 
} from "@/types/certificates";

type Certificate = PhdLmdCertificate | PhdScienceCertificate | MasterCertificate;

const TABLE_NAMES: Record<CertificateType, string> = {
  phd_lmd: 'phd_lmd_certificates',
  phd_science: 'phd_science_certificates',
  master: 'master_certificates',
};

export class CertificateService {
  /**
   * الحصول على جميع الشهادات من نوع معين
   */
  static async getAll(type: CertificateType): Promise<{ data: Certificate[] | null; error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getAll(tableName, 'created_at', 'DESC');
      if (result.success) {
        return { data: result.data as Certificate[], error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    if (type === 'phd_lmd') {
      const { data, error } = await supabase
        .from("phd_lmd_certificates")
        .select("*")
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    } else if (type === 'phd_science') {
      const { data, error } = await supabase
        .from("phd_science_certificates")
        .select("*")
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    } else {
      const { data, error } = await supabase
        .from("master_certificates")
        .select("*")
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    }
  }

  /**
   * الحصول على شهادة بالمعرف
   */
  static async getById(type: CertificateType, id: string): Promise<{ data: Certificate | null; error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getById(tableName, id);
      if (result.success) {
        return { data: result.data as Certificate, error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    if (type === 'phd_lmd') {
      const { data, error } = await supabase
        .from("phd_lmd_certificates")
        .select("*")
        .eq("id", id)
        .single();
      return { data: data as Certificate | null, error };
    } else if (type === 'phd_science') {
      const { data, error } = await supabase
        .from("phd_science_certificates")
        .select("*")
        .eq("id", id)
        .single();
      return { data: data as Certificate | null, error };
    } else {
      const { data, error } = await supabase
        .from("master_certificates")
        .select("*")
        .eq("id", id)
        .single();
      return { data: data as Certificate | null, error };
    }
  }

  /**
   * إضافة شهادة جديدة
   */
  static async create(
    type: CertificateType,
    certificate: Record<string, unknown>
  ): Promise<{ data: Certificate | null; error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    const fullNameAr = certificate.full_name_ar as string;
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.insert(tableName, certificate);
      
      if (result.success && result.data) {
        await db.insert('activity_log', {
          activity_type: 'student_added',
          description: `تم إضافة طالب: ${fullNameAr}`,
          entity_id: (result.data as { id: string }).id,
          entity_type: tableName,
        });
        return { data: result.data as Certificate, error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    let data = null;
    let error = null;
    
    if (type === 'phd_lmd') {
      const result = await supabase
        .from("phd_lmd_certificates")
        .insert(certificate as unknown as PhdLmdCertificate)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else if (type === 'phd_science') {
      const result = await supabase
        .from("phd_science_certificates")
        .insert(certificate as unknown as PhdScienceCertificate)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("master_certificates")
        .insert(certificate as unknown as MasterCertificate)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }
    
    if (data) {
      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب: ${fullNameAr}`,
        entity_id: data.id,
        entity_type: tableName,
      });
    }
    
    return { data: data as Certificate | null, error };
  }

  /**
   * تحديث شهادة
   */
  static async update(
    type: CertificateType,
    id: string,
    updates: Record<string, unknown>
  ): Promise<{ data: Certificate | null; error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.update(tableName, id, updates);
      if (result.success) {
        return { data: result.data as Certificate, error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    if (type === 'phd_lmd') {
      const { data, error } = await supabase
        .from("phd_lmd_certificates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      return { data: data as Certificate | null, error };
    } else if (type === 'phd_science') {
      const { data, error } = await supabase
        .from("phd_science_certificates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      return { data: data as Certificate | null, error };
    } else {
      const { data, error } = await supabase
        .from("master_certificates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      return { data: data as Certificate | null, error };
    }
  }

  /**
   * حذف شهادة
   */
  static async delete(type: CertificateType, id: string): Promise<{ error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.delete(tableName, id);
      return { error: result.success ? null : new Error(result.error) };
    }
    
    if (type === 'phd_lmd') {
      const { error } = await supabase.from("phd_lmd_certificates").delete().eq("id", id);
      return { error };
    } else if (type === 'phd_science') {
      const { error } = await supabase.from("phd_science_certificates").delete().eq("id", id);
      return { error };
    } else {
      const { error } = await supabase.from("master_certificates").delete().eq("id", id);
      return { error };
    }
  }

  /**
   * البحث في الشهادات
   */
  static async search(type: CertificateType, query: string): Promise<{ data: Certificate[] | null; error: Error | null }> {
    const tableName = TABLE_NAMES[type];
    
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.search(tableName, 'full_name_ar', query);
      if (result.success) {
        return { data: result.data as Certificate[], error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    if (type === 'phd_lmd') {
      const { data, error } = await supabase
        .from("phd_lmd_certificates")
        .select("*")
        .ilike("full_name_ar", `%${query}%`)
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    } else if (type === 'phd_science') {
      const { data, error } = await supabase
        .from("phd_science_certificates")
        .select("*")
        .ilike("full_name_ar", `%${query}%`)
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    } else {
      const { data, error } = await supabase
        .from("master_certificates")
        .select("*")
        .ilike("full_name_ar", `%${query}%`)
        .order("created_at", { ascending: false });
      return { data: data as Certificate[] | null, error };
    }
  }
}
