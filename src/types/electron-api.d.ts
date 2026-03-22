// Type definitions for Electron API

interface DbOperations {
  getAll: (tableName: string, orderBy?: string, orderDir?: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getById: (tableName: string, id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  insert: (tableName: string, data: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  update: (tableName: string, id: string, data: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  delete: (tableName: string, id: string) => Promise<{ success: boolean; error?: string }>;
  deleteAll: (tableName: string) => Promise<{ success: boolean; error?: string }>;
  search: (tableName: string, column: string, query: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  
  getSetting: (key: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  setSetting: (key: string, value: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getAllSettings: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  
  getUserSetting: (key: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  setUserSetting: (key: string, value: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getAllUserSettings: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  
  getTemplateWithFields: (templateId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  getFieldsByTemplateId: (templateId: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  
  getDropdownOptionsByType: (optionType: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  
  deleteOldActivities: (daysOld: number) => Promise<{ success: boolean; data?: { deletedCount: number }; error?: string }>;
  
  exportAllData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  importAllData: (backupData: unknown) => Promise<{ success: boolean; error?: string }>;
  saveBackupToFolder: (maxCount?: number) => Promise<{ success: boolean; data?: { fileName: string; path: string; created_at: string }; error?: string }>;
  listBackups: () => Promise<{ success: boolean; data?: Array<{ name: string; created_at: string }>; error?: string }>;
  loadBackupFromFolder: (fileName: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteBackupFromFolder: (fileName: string) => Promise<{ success: boolean; error?: string }>;
  
  getPath: () => Promise<{ success: boolean; data?: string; error?: string }>;
  
  // التخزين المحلي للملفات
  cacheRemoteFile: (remoteUrl: string, subFolder?: string) => Promise<{ success: boolean; data?: { localPath: string; localUrl: string; fileName: string; cached: boolean }; error?: string }>;
  getCachedFileUrl: (remoteUrl: string, subFolder?: string) => Promise<{ success: boolean; data?: { localPath: string; localUrl: string }; error?: string }>;
  saveLocalFile: (fileBuffer: number[], fileName: string, subFolder?: string) => Promise<{ success: boolean; data?: { localPath: string; localUrl: string; fileName: string }; error?: string }>;
  
  // إدارة الشبكة والأجهزة
  saveNetworkConfig: (sharedPath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  testNetworkPath: (testPath: string) => Promise<{ success: boolean; data?: { reachable: boolean; writable: boolean; error?: string }; error?: string }>;
  getDeviceRegistry: () => Promise<{ success: boolean; data?: Array<{ hostname: string; ip: string; firstSeen: string; lastActive: string }>; error?: string }>;
  updateDeviceRegistry: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  saveDeviceAliases: (aliases: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  getDeviceAliases: () => Promise<{ success: boolean; data?: Record<string, string>; error?: string }>;
  centralizedBackup: () => Promise<{ success: boolean; data?: { success: boolean; path?: string; folderName?: string; filesCount?: number; error?: string }; error?: string }>;
  getNetworkConfig: () => Promise<{ success: boolean; data?: { found: boolean; config: { sharedPath: string } | null; path: string | null }; error?: string }>;
  disconnectNetwork: () => Promise<{ success: boolean; error?: string }>;

  // إدارة المستخدمين
  hasUsers: () => Promise<{ success: boolean; data?: boolean; error?: string }>;
  authenticateUser: (username: string, password: string) => Promise<{ success: boolean; user?: unknown; error?: string }>;
  getAllUsers: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  addUser: (userData: { username: string; display_name?: string; password: string; role?: string }) => Promise<{ success: boolean; user?: unknown; error?: string }>;
  updateUser: (userId: string, updateData: Record<string, unknown>) => Promise<{ success: boolean; user?: unknown; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

interface ElectronAPI {
  getVersion: () => string;
  getPlatform: () => string;
  isElectron: boolean;

  saveFile?: (defaultFileName: string, content: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  getPrinters?: () => Promise<
    Array<{
      name: string;
      displayName?: string;
      description?: string;
      isDefault?: boolean;
      status?: number;
    }>
  >;

  printPdf?: (
    pdfArrayBuffer: ArrayBuffer,
    options?: { deviceName?: string }
  ) => Promise<{ success: boolean; error?: string }>;

  printNative?: (
    options?: { pageSize?: { width: number; height: number }; landscape?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;

  openPrintersSettings?: () => Promise<boolean>;
  
  db: DbOperations;

  // مراقبة الشبكة
  startNetworkMonitor?: () => Promise<{ success: boolean; error?: string }>;
  stopNetworkMonitor?: () => Promise<{ success: boolean; error?: string }>;
  onNetworkError?: (callback: () => void) => () => void;
  onNetworkRestored?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
