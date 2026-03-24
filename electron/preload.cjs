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
  printToPdf: (options) =>
    ipcRenderer.invoke('printers:print-to-pdf', { options }),
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
    getNetworkInfo: () =>
      ipcRenderer.invoke('db:getNetworkInfo'),
    
    // قفل السجلات
    acquireRecordLock: (tableName, recordId) =>
      ipcRenderer.invoke('db:acquireRecordLock', tableName, recordId),
    releaseRecordLock: (tableName, recordId) =>
      ipcRenderer.invoke('db:releaseRecordLock', tableName, recordId),
    checkRecordLock: (tableName, recordId) =>
      ipcRenderer.invoke('db:checkRecordLock', tableName, recordId),
    
    // التخزين المحلي للملفات (Cache)
    cacheRemoteFile: (remoteUrl, subFolder) =>
      ipcRenderer.invoke('db:cacheRemoteFile', remoteUrl, subFolder),
    getCachedFileUrl: (remoteUrl, subFolder) =>
      ipcRenderer.invoke('db:getCachedFileUrl', remoteUrl, subFolder),
    saveLocalFile: (fileBuffer, fileName, subFolder) =>
      ipcRenderer.invoke('db:saveLocalFile', fileBuffer, fileName, subFolder),
    resolveFontPath: (fontUrl) =>
      ipcRenderer.invoke('db:resolveFontPath', fontUrl),
    
    // إدارة الشبكة والأجهزة
    saveNetworkConfig: (sharedPath) =>
      ipcRenderer.invoke('db:saveNetworkConfig', sharedPath),
    testNetworkPath: (testPath) =>
      ipcRenderer.invoke('db:testNetworkPath', testPath),
    getDeviceRegistry: () =>
      ipcRenderer.invoke('db:getDeviceRegistry'),
    updateDeviceRegistry: () =>
      ipcRenderer.invoke('db:updateDeviceRegistry'),
    saveDeviceAliases: (aliases) =>
      ipcRenderer.invoke('db:saveDeviceAliases', aliases),
    getDeviceAliases: () =>
      ipcRenderer.invoke('db:getDeviceAliases'),
    centralizedBackup: () =>
      ipcRenderer.invoke('db:centralizedBackup'),
    getNetworkConfig: () =>
      ipcRenderer.invoke('db:getNetworkConfig'),
    disconnectNetwork: () =>
      ipcRenderer.invoke('db:disconnectNetwork'),
    
    // إدارة المستخدمين
    isNetworkMode: () =>
      ipcRenderer.invoke('db:isNetworkMode'),
    hasUsers: () =>
      ipcRenderer.invoke('db:hasUsers'),
    authenticateUser: (username, password) =>
      ipcRenderer.invoke('db:authenticateUser', username, password),
    getAllUsers: () =>
      ipcRenderer.invoke('db:getAllUsers'),
    addUser: (userData) =>
      ipcRenderer.invoke('db:addUser', userData),
    updateUser: (userId, updateData) =>
      ipcRenderer.invoke('db:updateUser', userId, updateData),
    deleteUser: (userId) =>
      ipcRenderer.invoke('db:deleteUser', userId),
    changePassword: (userId, oldPassword, newPassword) =>
      ipcRenderer.invoke('db:changePassword', userId, oldPassword, newPassword),
    recoverPasswordByQuestion: (username, securityAnswer, newPassword) =>
      ipcRenderer.invoke('db:recoverPasswordByQuestion', username, securityAnswer, newPassword),
    getSecurityQuestion: (username) =>
      ipcRenderer.invoke('db:getSecurityQuestion', username),
    checkEmergencyReset: () =>
      ipcRenderer.invoke('db:checkEmergencyReset'),
    getFailedLoginAlerts: () =>
      ipcRenderer.invoke('db:getFailedLoginAlerts'),
    dismissFailedLoginAlert: (alertId) =>
      ipcRenderer.invoke('db:dismissFailedLoginAlert', alertId),
  },

  // مراقبة الشبكة
  startNetworkMonitor: () => ipcRenderer.invoke('network:startMonitor'),
  stopNetworkMonitor: () => ipcRenderer.invoke('network:stopMonitor'),
  onNetworkError: (callback) => {
    ipcRenderer.on('network:connection-lost', () => callback());
    return () => ipcRenderer.removeAllListeners('network:connection-lost');
  },
  onNetworkRestored: (callback) => {
    ipcRenderer.on('network:connection-restored', () => callback());
    return () => ipcRenderer.removeAllListeners('network:connection-restored');
  },
});
