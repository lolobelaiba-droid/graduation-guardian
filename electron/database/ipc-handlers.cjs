/**
 * معالجات IPC لقاعدة البيانات
 * تربط بين Electron main process و renderer process
 */

const { ipcMain } = require('electron');
// استخدام JSON Store بدلاً من better-sqlite3
const db = require('./json-store.cjs');

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
  // سجل الأنشطة
  // ============================================

  ipcMain.handle('db:deleteOldActivities', async (_, daysOld) => {
    try {
      const result = db.deleteOldActivities(daysOld);
      return { success: true, data: result };
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

  ipcMain.handle('db:saveBackupToFolder', async (_, maxCount) => {
    try {
      const result = db.saveBackupToFolder(maxCount);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:listBackups', async () => {
    try {
      const data = db.listBackups();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:loadBackupFromFolder', async (_, fileName) => {
    try {
      const data = db.loadBackupFromFolder(fileName);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:deleteBackupFromFolder', async (_, fileName) => {
    try {
      const result = db.deleteBackupFromFolder(fileName);
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

  ipcMain.handle('db:getNetworkInfo', async () => {
    try {
      return { success: true, data: db.getNetworkInfo() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // قفل السجلات (Record Locking)
  // ============================================

  ipcMain.handle('db:acquireRecordLock', async (_, tableName, recordId) => {
    try {
      const result = db.acquireRecordLock(tableName, recordId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:releaseRecordLock', async (_, tableName, recordId) => {
    try {
      db.releaseRecordLock(tableName, recordId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:checkRecordLock', async (_, tableName, recordId) => {
    try {
      const result = db.checkRecordLock(tableName, recordId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // التخزين المحلي للملفات (Cache)
  // ============================================

  ipcMain.handle('db:cacheRemoteFile', async (_, remoteUrl, subFolder) => {
    try {
      const result = await db.cacheRemoteFile(remoteUrl, subFolder);
      // إرجاع file:// URL للملف المحلي
      const localUrl = db.getLocalFileUrl(result.localPath);
      return { success: true, data: { localPath: result.localPath, localUrl: localUrl, fileName: result.fileName, cached: result.cached } };
    } catch (error) {
      // إذا فشل التحميل، تحقق من وجود نسخة محلية
      const cachedPath = db.getCachedFilePath(remoteUrl, subFolder);
      if (cachedPath) {
        const localUrl = db.getLocalFileUrl(cachedPath);
        return { success: true, data: { localPath: cachedPath, localUrl: localUrl, cached: true } };
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getCachedFileUrl', async (_, remoteUrl, subFolder) => {
    try {
      const cachedPath = db.getCachedFilePath(remoteUrl, subFolder);
      if (cachedPath) {
        const localUrl = db.getLocalFileUrl(cachedPath);
        return { success: true, data: { localPath: cachedPath, localUrl: localUrl } };
      }
      return { success: false, error: 'File not cached' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // حفظ ملف محلي (رفع من المستخدم)
  ipcMain.handle('db:saveLocalFile', async (_, fileBuffer, fileName, subFolder) => {
    try {
      const result = db.saveLocalFile(fileBuffer, fileName, subFolder);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // إدارة الشبكة والأجهزة
  // ============================================

  ipcMain.handle('db:saveNetworkConfig', async (_, sharedPath) => {
    try {
      const result = db.saveNetworkConfig(sharedPath);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:testNetworkPath', async (_, testPath) => {
    try {
      const result = db.testNetworkPath(testPath);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getDeviceRegistry', async () => {
    try {
      const data = db.getDeviceRegistry();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateDeviceRegistry', async () => {
    try {
      const data = db.updateDeviceRegistry();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:saveDeviceAliases', async (_, aliases) => {
    try {
      const result = db.saveDeviceAliases(aliases);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getDeviceAliases', async () => {
    try {
      const data = db.getDeviceAliases();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:centralizedBackup', async () => {
    try {
      const result = db.centralizedBackup();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getNetworkConfig', async () => {
    try {
      const result = db.getNetworkConfig();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:disconnectNetwork', async () => {
    try {
      const result = db.disconnectNetwork();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // مراقبة الشبكة (Network Monitor)
  // ============================================

  var networkMonitorInterval = null;
  var previousNetworkState = null; // null = unknown, true = connected, false = disconnected
  var failureCount = 0;
  var FAILURE_THRESHOLD = 2; // عدد المحاولات الفاشلة قبل إعلان الانقطاع

  function startNetworkMonitor(mainWindow) {
    // إيقاف أي مراقب سابق
    if (networkMonitorInterval) {
      clearInterval(networkMonitorInterval);
      networkMonitorInterval = null;
    }

    // التحقق من وجود وضع شبكة
    var configResult = db.getNetworkConfig();
    if (!configResult || !configResult.found || !configResult.config || !configResult.config.sharedPath) {
      console.log('[NetworkMonitor] No network config found, monitor not started.');
      previousNetworkState = null;
      failureCount = 0;
      return;
    }

    var sharedPath = configResult.config.sharedPath;
    console.log('[NetworkMonitor] Starting monitor for:', sharedPath);
    previousNetworkState = true; // نفترض أن الاتصال يعمل عند البدء
    failureCount = 0;

    networkMonitorInterval = setInterval(function () {
      try {
        var result = db.testNetworkPath(sharedPath);
        var isReachable = result && result.reachable && result.writable;

        if (isReachable) {
          failureCount = 0;
          if (previousNetworkState === false) {
            // الاتصال عاد
            previousNetworkState = true;
            console.log('[NetworkMonitor] Connection restored.');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('network:connection-restored');
            }
          } else {
            previousNetworkState = true;
          }
        } else {
          failureCount++;
          if (failureCount >= FAILURE_THRESHOLD && previousNetworkState !== false) {
            previousNetworkState = false;
            console.log('[NetworkMonitor] Connection lost after', failureCount, 'failures.');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('network:connection-lost');
            }
          }
        }
      } catch (err) {
        failureCount++;
        if (failureCount >= FAILURE_THRESHOLD && previousNetworkState !== false) {
          previousNetworkState = false;
          console.log('[NetworkMonitor] Connection lost (error):', err.message);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('network:connection-lost');
          }
        }
      }
    }, 30000); // كل 30 ثانية
  }

  function stopNetworkMonitor() {
    if (networkMonitorInterval) {
      clearInterval(networkMonitorInterval);
      networkMonitorInterval = null;
      previousNetworkState = null;
      failureCount = 0;
      console.log('[NetworkMonitor] Stopped.');
    }
  }

  // IPC للتحكم بالمراقب من الواجهة
  ipcMain.handle('network:startMonitor', async () => {
    try {
      var { BrowserWindow } = require('electron');
      var win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      startNetworkMonitor(win);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('network:stopMonitor', async () => {
    try {
      stopNetworkMonitor();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // إدارة المستخدمين (Multi-User System)
  // ============================================

  ipcMain.handle('db:hasUsers', async () => {
    try {
      return { success: true, data: db.hasUsers() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:authenticateUser', async (_, username, password) => {
    try {
      return db.authenticateUser(username, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getAllUsers', async () => {
    try {
      return { success: true, data: db.getAllUsers() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:addUser', async (_, userData) => {
    try {
      return db.addUser(userData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateUser', async (_, userId, updateData) => {
    try {
      return db.updateUser(userId, updateData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:deleteUser', async (_, userId) => {
    try {
      return db.deleteUser(userId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:changePassword', async (_, userId, oldPassword, newPassword) => {
    try {
      return db.changePassword(userId, oldPassword, newPassword);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Database IPC handlers registered');

  // إرجاع دوال المراقبة للاستخدام من main.cjs
  return { startNetworkMonitor, stopNetworkMonitor };
}

module.exports = { registerDatabaseHandlers };
