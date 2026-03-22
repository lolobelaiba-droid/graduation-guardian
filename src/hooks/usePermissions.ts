import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

/**
 * نظام الصلاحيات المركزي
 * 
 * المدير (admin): صلاحيات كاملة
 * الموظف (employee): 
 *   ✅ عرض البيانات
 *   ✅ إضافة طلاب/سجلات
 *   ✅ تعديل الطلاب
 *   ✅ تصدير واستيراد
 *   ✅ طباعة الشهادات
 *   ❌ حذف السجلات
 *   ❌ إدارة المستخدمين
 *   ❌ تعديل الإعدادات العامة (الجامعة، الشبكة، كلمة المرور)
 *   ❌ تنظيف البيانات الجماعي
 *   ❌ إدارة القوالب (حذف)
 *   ❌ استعادة النسخ الاحتياطية
 */
export function usePermissions() {
  const { currentUser, isAdmin } = useAuth();

  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const canManageSettings = isAdmin;
  const canManageTemplates = isAdmin; // حذف القوالب فقط
  const canBulkCleanup = isAdmin;
  const canRestoreBackup = isAdmin;
  const canManageNetwork = isAdmin;
  const canChangeAppPassword = isAdmin;

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
  }, [isAdmin]);

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
