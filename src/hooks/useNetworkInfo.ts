import { useQuery } from "@tanstack/react-query";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export interface NetworkInfo {
  isNetwork: boolean;
  sharedPath: string | null;
  hostname: string;
  ip: string;
}

export function useNetworkInfo() {
  return useQuery({
    queryKey: ["network-info"],
    queryFn: async (): Promise<NetworkInfo | null> => {
      if (!isElectron()) return null;
      const db = getDbClient();
      if (!db || !('getNetworkInfo' in db)) return null;
      const result = await (db as any).getNetworkInfo();
      if (result.success && result.data) {
        return result.data as NetworkInfo;
      }
      return null;
    },
    staleTime: Infinity, // لا تتغير أثناء التشغيل
    retry: false,
  });
}
