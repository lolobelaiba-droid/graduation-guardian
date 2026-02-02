/**
 * معالجات IPC لقاعدة البيانات
 * تربط بين Electron main process و renderer process
 */

const { ipcMain } = require('electron');
// استخدام JSON Store بدلاً من better-sqlite3
const db = require('./json-store');

/**
 * تسجيل جميع معالجات IPC
 */
function registerDatabaseHandlers() {
  // ============================================
  // عمليات CRUD العامة
  // ============================================
  
  ipcMain.handle('db:getAll', async (_, tableName, orderBy, orderDir) => {
    try {
      return { success: true, data: db.getAll(tableName, orderBy, orderDir) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getById', async (_, tableName, id) => {
    try {
      const data = db.getById(tableName, id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:insert', async (_, tableName, data) => {
    try {
      const result = db.insert(tableName, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:update', async (_, tableName, id, data) => {
    try {
      const result = db.update(tableName, id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:delete', async (_, tableName, id) => {
    try {
      db.deleteById(tableName, id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:deleteAll', async (_, tableName) => {
    try {
      db.deleteAll(tableName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:search', async (_, tableName, column, query) => {
    try {
      const data = db.search(tableName, column, query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // الإعدادات
  // ============================================

  ipcMain.handle('db:getSetting', async (_, key) => {
    try {
      const data = db.getSetting(key);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:setSetting', async (_, key, value) => {
    try {
      const data = db.setSetting(key, value);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getAllSettings', async () => {
    try {
      const data = db.getAllSettings();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // إعدادات المستخدم
  // ============================================

  ipcMain.handle('db:getUserSetting', async (_, key) => {
    try {
      const data = db.getUserSetting(key);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:setUserSetting', async (_, key, value) => {
    try {
      const data = db.setUserSetting(key, value);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getAllUserSettings', async () => {
    try {
      const data = db.getAllUserSettings();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // القوالب مع الحقول
  // ============================================

  ipcMain.handle('db:getTemplateWithFields', async (_, templateId) => {
    try {
      const data = db.getTemplateWithFields(templateId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getFieldsByTemplateId', async (_, templateId) => {
    try {
      const data = db.getFieldsByTemplateId(templateId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // خيارات القوائم المنسدلة
  // ============================================

  ipcMain.handle('db:getDropdownOptionsByType', async (_, optionType) => {
    try {
      const data = db.getDropdownOptionsByType(optionType);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // النسخ الاحتياطي والاستعادة
  // ============================================

  ipcMain.handle('db:exportAllData', async () => {
    try {
      const data = db.exportAllData();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:importAllData', async (_, backupData) => {
    try {
      const result = db.importAllData(backupData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // معلومات قاعدة البيانات
  // ============================================

  ipcMain.handle('db:getPath', async () => {
    try {
      return { success: true, data: db.getDatabasePath() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Database IPC handlers registered');
}

module.exports = { registerDatabaseHandlers };
