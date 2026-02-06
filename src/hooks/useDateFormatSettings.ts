import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isElectron, getDbClient } from '@/lib/database/db-client';
import {
  DateFormatSettings,
  DEFAULT_DATE_FORMAT_SETTINGS,
} from '@/lib/dateFormats';

const SETTINGS_KEY = 'date_format_settings';

// In-memory cache for the settings
let cachedSettings: DateFormatSettings | null = null;

export function useDateFormatSettings() {
  const [settings, setSettings] = useState<DateFormatSettings>(
    cachedSettings || DEFAULT_DATE_FORMAT_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(!cachedSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        if (isElectron()) {
          const db = getDbClient()!;
          const result = await db.getSetting(SETTINGS_KEY);
          if (result.success && result.data) {
            const setting = result.data as { value: string | null };
            if (setting.value) {
              const parsed = JSON.parse(setting.value) as DateFormatSettings;
              const merged = mergeWithDefaults(parsed);
              cachedSettings = merged;
              setSettings(merged);
            }
          }
        } else {
          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', SETTINGS_KEY)
            .single();

          if (!error && data?.value) {
            const parsed = JSON.parse(data.value) as DateFormatSettings;
            const merged = mergeWithDefaults(parsed);
            cachedSettings = merged;
            setSettings(merged);
          }
        }
      } catch (err) {
        console.error('Error loading date format settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings: DateFormatSettings) => {
    setIsSaving(true);
    try {
      const jsonValue = JSON.stringify(newSettings);

      if (isElectron()) {
        const db = getDbClient()!;
        await db.setSetting(SETTINGS_KEY, jsonValue);
      } else {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', SETTINGS_KEY)
          .single();

        if (existing) {
          await supabase
            .from('settings')
            .update({ value: jsonValue })
            .eq('id', existing.id);
        } else {
          await supabase.from('settings').insert([{ key: SETTINGS_KEY, value: jsonValue }]);
        }
      }

      cachedSettings = newSettings;
      setSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error saving date format settings:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
  };
}

/**
 * Merge loaded settings with defaults to handle migration from old format
 */
function mergeWithDefaults(parsed: any): DateFormatSettings {
  const defaults = DEFAULT_DATE_FORMAT_SETTINGS;
  
  if (parsed.birthDate?.ar) {
    return {
      birthDate: {
        ar: { ...defaults.birthDate.ar, ...parsed.birthDate?.ar },
        fr: { ...defaults.birthDate.fr, ...parsed.birthDate?.fr },
      },
      defenseDate: {
        ar: { ...defaults.defenseDate.ar, ...parsed.defenseDate?.ar },
        fr: { ...defaults.defenseDate.fr, ...parsed.defenseDate?.fr },
      },
      certificateDate: {
        ar: { ...defaults.certificateDate.ar, ...parsed.certificateDate?.ar },
        fr: { ...defaults.certificateDate.fr, ...parsed.certificateDate?.fr },
      },
    };
  }
  
  if (parsed.birthDateFormat) {
    return {
      birthDate: {
        ar: { formatId: parsed.birthDateFormat, customPattern: parsed.birthDateCustomPattern || 'DD/MM/YYYY' },
        fr: { formatId: parsed.birthDateFormat, customPattern: parsed.birthDateCustomPattern || 'DD/MM/YYYY' },
      },
      defenseDate: {
        ar: { formatId: parsed.defenseDateFormat, customPattern: parsed.defenseDateCustomPattern || 'DD MMMM YYYY' },
        fr: { formatId: parsed.defenseDateFormat, customPattern: parsed.defenseDateCustomPattern || 'DD MMMM YYYY' },
      },
      certificateDate: {
        ar: { formatId: parsed.certificateDateFormat, customPattern: parsed.certificateDateCustomPattern || 'DD/MM/YYYY' },
        fr: { formatId: parsed.certificateDateFormat, customPattern: parsed.certificateDateCustomPattern || 'DD/MM/YYYY' },
      },
    };
  }
  
  return defaults;
}

/**
 * Fetch date format settings synchronously from cache or return defaults
 */
export function getCachedDateFormatSettings(): DateFormatSettings {
  return cachedSettings || DEFAULT_DATE_FORMAT_SETTINGS;
}

/**
 * Fetch date format settings (async)
 */
export async function fetchDateFormatSettings(): Promise<DateFormatSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getSetting('date_format_settings');
      if (result.success && result.data) {
        const setting = result.data as { value: string | null };
        if (setting.value) {
          const parsed = JSON.parse(setting.value);
          cachedSettings = mergeWithDefaults(parsed);
          return cachedSettings;
        }
      }
    } else {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'date_format_settings')
        .single();

      if (!error && data?.value) {
        const parsed = JSON.parse(data.value);
        cachedSettings = mergeWithDefaults(parsed);
        return cachedSettings;
      }
    }
  } catch {
    // Fallback to defaults
  }

  return DEFAULT_DATE_FORMAT_SETTINGS;
}
