import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', SETTINGS_KEY)
          .single();

        if (!error && data?.value) {
          const parsed = JSON.parse(data.value) as DateFormatSettings;
          const merged = { ...DEFAULT_DATE_FORMAT_SETTINGS, ...parsed };
          cachedSettings = merged;
          setSettings(merged);
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

      // Check if setting exists
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
 * Fetch date format settings synchronously from cache or return defaults
 * For use in PDF generator and other sync contexts
 */
export function getCachedDateFormatSettings(): DateFormatSettings {
  return cachedSettings || DEFAULT_DATE_FORMAT_SETTINGS;
}

/**
 * Fetch date format settings (async)
 * For use when cache may not be populated
 */
export async function fetchDateFormatSettings(): Promise<DateFormatSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'date_format_settings')
      .single();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value) as DateFormatSettings;
      cachedSettings = { ...DEFAULT_DATE_FORMAT_SETTINGS, ...parsed };
      return cachedSettings;
    }
  } catch {
    // Fallback to defaults
  }

  return DEFAULT_DATE_FORMAT_SETTINGS;
}
