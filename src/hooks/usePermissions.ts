import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

/**
 * نظام الصلاحيات المركزي مع دعم الصلاحيات المخصصة لكل موظف
 * 
 * المدير (admin): صلاحيات كاملة دائماً
 * الموظف (employee): 
 *   ✅ الصلاحيات الثابتة: عرض، إضافة، تعديل، تصدير، استيراد، طباعة
 *   🔧 صلاحيات قابلة للتخصيص: حذف، إدارة مستخدمين، إعدادات، قوالب، تنظيف، نسخ احتياطي، شبكة
 */
export function usePermissions() {
  const { currentUser, isAdmin } = useAuth();

  // الحصول على الصلاحيات المخصصة للموظف
  const customPerms = (currentUser as any)?.custom_permissions as Record<string, boolean> | undefined;

  const hasCustomPerm = useCallback((key: string): boolean => {
    if (isAdmin) return true;
    if (customPerms && typeof customPerms === "object" && key in customPerms) {
      return customPerms[key] === true;
    }
    return false; // الافتراضي للموظف
  }, [isAdmin, customPerms]);

  const canDelete = hasCustomPerm("delete");
  const canManageUsers = hasCustomPerm("manage_users");
  const canManageSettings = hasCustomPerm("manage_settings");
  const canManageTemplates = hasCustomPerm("manage_templates");
  const canBulkCleanup = hasCustomPerm("bulk_cleanup");
  const canRestoreBackup = hasCustomPerm("restore_backup");
  const canManageNetwork = hasCustomPerm("manage_network");
  const canChangeAppPassword = hasCustomPerm("change_app_password");

  // الصلاحيات المتاحة للجميع
  const canView = true;
  const canAdd = true;
  const canEdit = true;
  const canExport = true;
  const canImport = true;
  const canPrint = true;

  const checkPermission = useCallback((action: string): boolean => {
    switch (action) {
      case "delete": return canDelete;
      case "manage_users": return canManageUsers;
      case "manage_settings": return canManageSettings;
      case "manage_templates": return canManageTemplates;
      case "bulk_cleanup": return canBulkCleanup;
      case "restore_backup": return canRestoreBackup;
      case "manage_network": return canManageNetwork;
      case "change_app_password": return canChangeAppPassword;
      default: return true;
    }
  }, [canDelete, canManageUsers, canManageSettings, canManageTemplates, canBulkCleanup, canRestoreBackup, canManageNetwork, canChangeAppPassword]);

  const requirePermission = useCallback((action: string): boolean => {
    const allowed = checkPermission(action);
    if (!allowed) {
      toast.error("ليس لديك صلاحية لتنفيذ هذا الإجراء");
    }
    return allowed;
  }, [checkPermission]);

  return {
    currentUser,
    isAdmin,
    canDelete,
    canManageUsers,
    canManageSettings,
    canManageTemplates,
    canBulkCleanup,
    canRestoreBackup,
    canManageNetwork,
    canChangeAppPassword,
    canView,
    canAdd,
    canEdit,
    canExport,
    canImport,
    canPrint,
    checkPermission,
    requirePermission,
  };
}
