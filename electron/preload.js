// Preload script for Electron
// This runs in the renderer process before the page loads
// Can be used to expose specific Node.js functionality to the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  isElectron: true,

  // File operations
  saveFile: (defaultFileName, content) =>
    ipcRenderer.invoke('file:saveDialog', { defaultFileName, content }),

  // Printers
  getPrinters: () => ipcRenderer.invoke('printers:list'),
  printPdf: (pdfArrayBuffer, options) =>
    ipcRenderer.invoke('printers:print-pdf', { pdf: pdfArrayBuffer, options }),
  printNative: (options) =>
    ipcRenderer.invoke('printers:print-native', { options }),
  openPrintersSettings: () => ipcRenderer.invoke('printers:open-settings'),

  // ============================================
  // Database Operations
  // ============================================
  
  // CRUD العامة
  db: {
    getAll: (tableName, orderBy, orderDir) => 
      ipcRenderer.invoke('db:getAll', tableName, orderBy, orderDir),
    getById: (tableName, id) => 
      ipcRenderer.invoke('db:getById', tableName, id),
    insert: (tableName, data) => 
      ipcRenderer.invoke('db:insert', tableName, data),
    update: (tableName, id, data) => 
      ipcRenderer.invoke('db:update', tableName, id, data),
    delete: (tableName, id) => 
      ipcRenderer.invoke('db:delete', tableName, id),
    deleteAll: (tableName) => 
      ipcRenderer.invoke('db:deleteAll', tableName),
    search: (tableName, column, query) => 
      ipcRenderer.invoke('db:search', tableName, column, query),
    
    // الإعدادات
    getSetting: (key) => 
      ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key, value) => 
      ipcRenderer.invoke('db:setSetting', key, value),
    getAllSettings: () => 
      ipcRenderer.invoke('db:getAllSettings'),
    
    // إعدادات المستخدم
    getUserSetting: (key) => 
      ipcRenderer.invoke('db:getUserSetting', key),
    setUserSetting: (key, value) => 
      ipcRenderer.invoke('db:setUserSetting', key, value),
    getAllUserSettings: () => 
      ipcRenderer.invoke('db:getAllUserSettings'),
    
    // القوالب
    getTemplateWithFields: (templateId) => 
      ipcRenderer.invoke('db:getTemplateWithFields', templateId),
    getFieldsByTemplateId: (templateId) => 
      ipcRenderer.invoke('db:getFieldsByTemplateId', templateId),
    
    // القوائم المنسدلة
    getDropdownOptionsByType: (optionType) => 
      ipcRenderer.invoke('db:getDropdownOptionsByType', optionType),
    
    // سجل الأنشطة
    deleteOldActivities: (daysOld) => 
      ipcRenderer.invoke('db:deleteOldActivities', daysOld),
    
    // النسخ الاحتياطي
    exportAllData: () => 
      ipcRenderer.invoke('db:exportAllData'),
    importAllData: (backupData) => 
      ipcRenderer.invoke('db:importAllData', backupData),
    saveBackupToFolder: (maxCount) =>
      ipcRenderer.invoke('db:saveBackupToFolder', maxCount),
    listBackups: () =>
      ipcRenderer.invoke('db:listBackups'),
    loadBackupFromFolder: (fileName) =>
      ipcRenderer.invoke('db:loadBackupFromFolder', fileName),
    deleteBackupFromFolder: (fileName) =>
      ipcRenderer.invoke('db:deleteBackupFromFolder', fileName),
    
    // معلومات
    getPath: () => 
      ipcRenderer.invoke('db:getPath'),
  },
});
