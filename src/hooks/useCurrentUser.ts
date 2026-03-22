import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the current user's display name for activity logging.
 * Falls back to "النظام" if no user is logged in.
 */
export function useCurrentUserName(): string {
  const { currentUser } = useAuth();
  return currentUser?.display_name || "النظام";
}

/**
 * Returns the current user's role
 */
export function useCurrentUserRole(): "admin" | "employee" | null {
  const { currentUser } = useAuth();
  return currentUser?.role || null;
}
