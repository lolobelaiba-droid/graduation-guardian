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
  
  getPath: () => Promise<{ success: boolean; data?: string; error?: string }>;
}

interface ElectronAPI {
  getVersion: () => string;
  getPlatform: () => string;
  isElectron: boolean;

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

  openPrintersSettings?: () => Promise<boolean>;
  
  db: DbOperations;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
