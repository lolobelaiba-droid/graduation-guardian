import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

interface FieldDomainOption {
  option_value: string;
  value_ar: string | null;
  value_fr: string | null;
}

export function useFieldDomainSync() {
  const { data: fieldArOptions = [] } = useQuery({
    queryKey: ['dropdown_options', 'field_ar', 'with_translations'],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getDropdownOptionsByType('field_ar');
        return (result.success ? result.data : []) as FieldDomainOption[];
      }
      const { data } = await supabase
        .from('dropdown_options')
        .select('option_value, value_ar, value_fr')
        .eq('option_type', 'field_ar')
        .order('display_order', { ascending: true });
      return (data || []) as FieldDomainOption[];
    },
  });

  const getFrFromAr = (arValue: string): string | null => {
    const match = fieldArOptions.find(o => o.option_value === arValue || o.value_ar === arValue);
    return match?.value_fr || null;
  };

  const getArFromFr = (frValue: string): string | null => {
    const match = fieldArOptions.find(o => o.value_fr === frValue);
    return match?.value_ar || match?.option_value || null;
  };

  return { getFrFromAr, getArFromFr };
}
