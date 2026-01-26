/**
 * خدمة الإعدادات - تعمل مع Supabase أو SQLite
 */

import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient, wrapElectronResult, wrapElectronListResult } from "./db-client";
import type { Json } from "@/integrations/supabase/types";

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string | null;
}

export interface UserSetting {
  id: string;
  setting_key: string;
  setting_value: Json | null;
  updated_at: string | null;
}

export class SettingsService {
  /**
   * الحصول على جميع الإعدادات
   */
  static async getAll(): Promise<{ data: Setting[] | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getAllSettings();
      return wrapElectronListResult<Setting>(result as { success: boolean; data?: Setting[]; error?: string });
    }
    
    const { data, error } = await supabase
      .from("settings")
      .select("*");
    
    return { data, error };
  }

  /**
   * الحصول على إعداد بالمفتاح
   */
  static async get(key: string): Promise<{ data: Setting | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getSetting(key);
      return wrapElectronResult<Setting>(result as { success: boolean; data?: Setting; error?: string });
    }
    
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("key", key)
      .single();
    
    return { data, error };
  }

  /**
   * تعيين قيمة إعداد
   */
  static async set(key: string, value: string): Promise<{ data: Setting | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.setSetting(key, value);
      return wrapElectronResult<Setting>(result as { success: boolean; data?: Setting; error?: string });
    }
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("settings")
        .update({ value })
        .eq("id", existing.id)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from("settings")
        .insert([{ key, value }])
        .select()
        .single();
      return { data, error };
    }
  }
}

export class UserSettingsService {
  /**
   * الحصول على جميع إعدادات المستخدم
   */
  static async getAll(): Promise<{ data: UserSetting[] | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getAllUserSettings();
      
      // تحويل JSON strings إلى objects
      if (result.success && result.data) {
        const transformedData = (result.data as unknown[]).map((s: unknown) => {
          const setting = s as { setting_value?: string | Json };
          return {
            ...setting,
            setting_value: typeof setting.setting_value === 'string' 
              ? JSON.parse(setting.setting_value) 
              : setting.setting_value
          };
        });
        return { data: transformedData as UserSetting[], error: null };
      }
      
      return wrapElectronListResult<UserSetting>(result as { success: boolean; data?: UserSetting[]; error?: string });
    }
    
    const { data, error } = await supabase
      .from("user_settings")
      .select("*");
    
    return { data, error };
  }

  /**
   * الحصول على إعداد مستخدم
   */
  static async get(key: string): Promise<{ data: UserSetting | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getUserSetting(key);
      
      if (result.success && result.data) {
        const setting = result.data as { setting_value?: string | Json };
        if (typeof setting.setting_value === 'string') {
          setting.setting_value = JSON.parse(setting.setting_value);
        }
      }
      
      return wrapElectronResult<UserSetting>(result as { success: boolean; data?: UserSetting; error?: string });
    }
    
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("setting_key", key)
      .single();
    
    return { data, error };
  }

  /**
   * تعيين إعداد مستخدم
   */
  static async set(key: string, value: Json): Promise<{ data: UserSetting | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.setUserSetting(key, value);
      
      if (result.success && result.data) {
        const setting = result.data as { setting_value?: string | Json };
        if (typeof setting.setting_value === 'string') {
          setting.setting_value = JSON.parse(setting.setting_value);
        }
      }
      
      return wrapElectronResult<UserSetting>(result as { success: boolean; data?: UserSetting; error?: string });
    }
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("setting_key", key)
      .single();

    const jsonValue = { value } as Json;

    if (existing) {
      const { data, error } = await supabase
        .from("user_settings")
        .update({ setting_value: jsonValue })
        .eq("id", existing.id)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from("user_settings")
        .insert([{ setting_key: key, setting_value: jsonValue }])
        .select()
        .single();
      return { data, error };
    }
  }
}
