/**
 * نظام تخزين البيانات باستخدام ملفات JSON
 * بديل عن better-sqlite3 لتجنب مشاكل البناء مع Native modules
 * ملاحظة: يستخدم صيغة ES5 للتوافق مع Electron
 */

var path = require('path');
var fs = require('fs');
var app = require('electron').app;

// مسار مجلد البيانات
var dataDir = null;

/**
 * الحصول على مسار مجلد البيانات
 */
function getDataDir() {
  if (dataDir) return dataDir;
  var userDataPath = app.getPath('userData');
  dataDir = path.join(userDataPath, 'data');
  return dataDir;
}

/**
 * الحصول على مسار ملف جدول معين
 */
function getTablePath(tableName) {
  return path.join(getDataDir(), tableName + '.json');
}

/**
 * التأكد من وجود مجلد البيانات
 */
function ensureDataDir() {
  var dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * قراءة بيانات جدول
 */
function readTable(tableName) {
  var filePath = getTablePath(tableName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading table ' + tableName + ':', error);
    return [];
  }
}

/**
 * كتابة بيانات جدول
 */
function writeTable(tableName, data) {
  ensureDataDir();
  var filePath = getTablePath(tableName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing table ' + tableName + ':', error);
    return false;
  }
}

/**
 * توليد UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * الحصول على التاريخ والوقت الحالي
 */
function getCurrentDateTime() {
  return new Date().toISOString();
}

/**
 * الحصول على التاريخ الحالي فقط
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// تهيئة قاعدة البيانات
// ============================================

function initializeDatabase() {
  ensureDataDir();
  console.log('JSON Store initialized at:', getDataDir());
  
  // إنشاء الجداول الافتراضية إذا لم تكن موجودة
  var tables = [
    'settings',
    'user_settings',
    'phd_lmd_certificates',
    'phd_science_certificates',
    'master_certificates',
    'certificate_templates',
    'certificate_template_fields',
    'custom_fonts',
    'dropdown_options',
    'activity_log',
    'print_history',
    'phd_lmd_students',
    'phd_science_students',
    'academic_titles',
    'custom_fields',
    'custom_field_values',
    'custom_field_options',
    'notes'
  ];
  
  tables.forEach(function(table) {
    var filePath = getTablePath(table);
    if (!fs.existsSync(filePath)) {
      writeTable(table, []);
    }
  });
  
  console.log('Database initialized successfully');
}

function closeDatabase() {
  // لا يوجد اتصال للإغلاق في نظام JSON
  console.log('JSON Store closed');
}

function getDatabasePath() {
  return getDataDir();
}

// ============================================
// عمليات CRUD العامة
// ============================================

function getAll(tableName, orderBy, orderDir) {
  if (orderBy === undefined) orderBy = 'created_at';
  if (orderDir === undefined) orderDir = 'DESC';
  
  var data = readTable(tableName);
  
  // ترتيب البيانات
  return data.sort(function(a, b) {
    var aVal = a[orderBy] || '';
    var bVal = b[orderBy] || '';
    
    if (orderDir.toUpperCase() === 'ASC') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

function getById(tableName, id) {
  var data = readTable(tableName);
  for (var i = 0; i < data.length; i++) {
    if (data[i].id === id) {
      return data[i];
    }
  }
  return null;
}

function insert(tableName, record) {
  var data = readTable(tableName);
  
  var newRecord = {};
  // نسخ جميع الخصائص من السجل الأصلي
  for (var key in record) {
    if (record.hasOwnProperty(key)) {
      newRecord[key] = record[key];
    }
  }
  // إضافة الخصائص الافتراضية
  newRecord.id = record.id || generateUUID();
  newRecord.created_at = record.created_at || getCurrentDateTime();
  newRecord.updated_at = getCurrentDateTime();
  
  data.push(newRecord);
  writeTable(tableName, data);
  
  return newRecord;
}

function update(tableName, id, updates) {
  var data = readTable(tableName);
  var index = -1;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i].id === id) {
      index = i;
      break;
    }
  }
  
  if (index === -1) {
    return null;
  }
  
  // دمج التحديثات مع السجل الحالي
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      data[index][key] = updates[key];
    }
  }
  data[index].updated_at = getCurrentDateTime();
  
  writeTable(tableName, data);
  return data[index];
}

function deleteById(tableName, id) {
  var data = readTable(tableName);
  var filtered = data.filter(function(item) {
    return item.id !== id;
  });
  writeTable(tableName, filtered);
  return { changes: data.length - filtered.length };
}

function deleteAll(tableName) {
  writeTable(tableName, []);
  return { changes: 1 };
}

function search(tableName, column, query) {
  var data = readTable(tableName);
  var lowerQuery = query.toLowerCase();
  
  return data.filter(function(item) {
    var value = item[column];
    if (typeof value === 'string') {
      return value.toLowerCase().indexOf(lowerQuery) !== -1;
    }
    return false;
  });
}

// ============================================
// عمليات خاصة بالإعدادات
// ============================================

function getSetting(key) {
  var data = readTable('settings');
  for (var i = 0; i < data.length; i++) {
    if (data[i].key === key) {
      return data[i];
    }
  }
  return null;
}

function setSetting(key, value) {
  var data = readTable('settings');
  var index = -1;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i].key === key) {
      index = i;
      break;
    }
  }
  
  if (index !== -1) {
    data[index].value = value;
    data[index].updated_at = getCurrentDateTime();
  } else {
    data.push({
      id: generateUUID(),
      key: key,
      value: value,
      updated_at: getCurrentDateTime()
    });
  }
  
  writeTable('settings', data);
  return getSetting(key);
}

function getAllSettings() {
  return readTable('settings');
}

// ============================================
// عمليات خاصة بإعدادات المستخدم
// ============================================

function getUserSetting(key) {
  var data = readTable('user_settings');
  for (var i = 0; i < data.length; i++) {
    if (data[i].setting_key === key) {
      var item = {};
      for (var k in data[i]) {
        if (data[i].hasOwnProperty(k)) {
          item[k] = data[i][k];
        }
      }
      // Parse setting_value if it's a JSON string
      if (typeof item.setting_value === 'string') {
        try { item.setting_value = JSON.parse(item.setting_value); } catch(e) {}
      }
      return item;
    }
  }
  return null;
}

function setUserSetting(key, value) {
  var data = readTable('user_settings');
  var index = -1;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i].setting_key === key) {
      index = i;
      break;
    }
  }
  
  var jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (index !== -1) {
    data[index].setting_value = jsonValue;
    data[index].updated_at = getCurrentDateTime();
  } else {
    data.push({
      id: generateUUID(),
      setting_key: key,
      setting_value: jsonValue,
      updated_at: getCurrentDateTime()
    });
  }
  
  writeTable('user_settings', data);
  return getUserSetting(key);
}

function getAllUserSettings() {
  var data = readTable('user_settings');
  return data.map(function(item) {
    var result = {};
    for (var key in item) {
      if (item.hasOwnProperty(key)) {
        result[key] = item[key];
      }
    }
    // Parse setting_value if it's a JSON string
    if (typeof result.setting_value === 'string') {
      try { result.setting_value = JSON.parse(result.setting_value); } catch(e) {}
    }
    return result;
  });
}

// ============================================
// عمليات خاصة بالقوالب مع الحقول
// ============================================

function getTemplateWithFields(templateId) {
  var template = getById('certificate_templates', templateId);
  if (!template) return null;
  
  var allFields = readTable('certificate_template_fields');
  var fields = allFields.filter(function(f) {
    return f.template_id === templateId;
  });
  
  fields.sort(function(a, b) {
    var orderA = a.field_order || 0;
    var orderB = b.field_order || 0;
    return orderA - orderB;
  });
  
  // نسخ القالب وإضافة الحقول
  var result = {};
  for (var key in template) {
    if (template.hasOwnProperty(key)) {
      result[key] = template[key];
    }
  }
  result.certificate_template_fields = fields;
  
  return result;
}

function getFieldsByTemplateId(templateId) {
  var allFields = readTable('certificate_template_fields');
  var filtered = allFields.filter(function(f) {
    return f.template_id === templateId;
  });
  
  filtered.sort(function(a, b) {
    var orderA = a.field_order || 0;
    var orderB = b.field_order || 0;
    return orderA - orderB;
  });
  
  return filtered;
}

// ============================================
// عمليات خاصة بخيارات القوائم المنسدلة
// ============================================

function getDropdownOptionsByType(optionType) {
  var allOptions = readTable('dropdown_options');
  var filtered = allOptions.filter(function(o) {
    return o.option_type === optionType;
  });
  
  filtered.sort(function(a, b) {
    var orderA = a.display_order || 0;
    var orderB = b.display_order || 0;
    return orderA - orderB;
  });
  
  return filtered;
}

// ============================================
// عمليات خاصة بسجل الأنشطة
// ============================================

function deleteOldActivities(daysOld) {
  if (daysOld === undefined) {
    daysOld = 30;
  }
  
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  var cutoffISO = cutoffDate.toISOString();
  
  var data = readTable('activity_log');
  var filtered = data.filter(function(item) {
    if (!item.created_at) return true;
    return item.created_at >= cutoffISO;
  });
  
  var deletedCount = data.length - filtered.length;
  writeTable('activity_log', filtered);
  
  return { deletedCount: deletedCount };
}

// ============================================
// عمليات النسخ الاحتياطي والاستعادة
// ============================================

function getBackupsDir() {
  var dir = path.join(getDataDir(), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function exportAllData() {
  return {
    version: '2.0',
    created_at: getCurrentDateTime(),
    data: {
      phd_lmd_certificates: readTable('phd_lmd_certificates'),
      phd_science_certificates: readTable('phd_science_certificates'),
      master_certificates: readTable('master_certificates'),
      certificate_templates: readTable('certificate_templates'),
      certificate_template_fields: readTable('certificate_template_fields'),
      settings: readTable('settings'),
      user_settings: readTable('user_settings'),
      dropdown_options: readTable('dropdown_options'),
      custom_fonts: readTable('custom_fonts'),
      activity_log: readTable('activity_log'),
      phd_lmd_students: readTable('phd_lmd_students'),
      phd_science_students: readTable('phd_science_students'),
      academic_titles: readTable('academic_titles'),
      custom_fields: readTable('custom_fields'),
      custom_field_values: readTable('custom_field_values'),
      custom_field_options: readTable('custom_field_options'),
      print_history: readTable('print_history'),
      notes: readTable('notes')
    }
  };
}

function importAllData(backupData) {
  var data = backupData.data;
  
  var tableNames = [
    'phd_lmd_certificates',
    'phd_science_certificates',
    'master_certificates',
    'certificate_templates',
    'certificate_template_fields',
    'dropdown_options',
    'custom_fonts',
    'settings',
    'user_settings',
    'activity_log',
    'phd_lmd_students',
    'phd_science_students',
    'academic_titles',
    'custom_fields',
    'custom_field_values',
    'custom_field_options',
    'print_history',
    'notes'
  ];
  
  tableNames.forEach(function(tableName) {
    if (data[tableName]) {
      writeTable(tableName, data[tableName]);
    }
  });
  
  return { success: true };
}

/**
 * حفظ نسخة احتياطية في مجلد النسخ الداخلي
 */
function saveBackupToFolder(maxCount) {
  var backupData = exportAllData();
  var dir = getBackupsDir();
  var now = new Date();
  var fileName = 'backup_' + now.toISOString().replace(/[:.]/g, '-') + '.json';
  var filePath = path.join(dir, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
  
  // حذف النسخ القديمة إذا تجاوزت الحد
  var max = maxCount || 10;
  var files = fs.readdirSync(dir)
    .filter(function(f) { return f.endsWith('.json'); })
    .sort()
    .reverse();
  
  if (files.length > max) {
    files.slice(max).forEach(function(f) {
      try { fs.unlinkSync(path.join(dir, f)); } catch(e) { /* ignore */ }
    });
  }
  
  return { fileName: fileName, path: filePath, created_at: now.toISOString() };
}

/**
 * قائمة النسخ الاحتياطية المحفوظة
 */
function listBackups() {
  var dir = getBackupsDir();
  if (!fs.existsSync(dir)) return [];
  
  var files = fs.readdirSync(dir)
    .filter(function(f) { return f.endsWith('.json'); })
    .map(function(f) {
      var stat = fs.statSync(path.join(dir, f));
      return { name: f, created_at: stat.mtime.toISOString() };
    })
    .sort(function(a, b) { return b.created_at.localeCompare(a.created_at); });
  
  return files;
}

/**
 * تحميل نسخة احتياطية من المجلد
 */
function loadBackupFromFolder(fileName) {
  var filePath = path.join(getBackupsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error('ملف النسخة الاحتياطية غير موجود: ' + fileName);
  }
  var content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * حذف نسخة احتياطية
 */
function deleteBackupFromFolder(fileName) {
  var filePath = path.join(getBackupsDir(), fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return { success: true };
}

// ============================================
// حفظ ملفات محلية (رفع من المستخدم مباشرة)
// ============================================

/**
 * حفظ ملف مرفوع من المستخدم محلياً (مثل خط TTF)
 * يُرجع المسار المحلي و file:// URL
 */
function saveLocalFile(fileBuffer, fileName, subFolder) {
  var dir = path.join(getDataDir(), 'cache', subFolder || 'files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  var localPath = path.join(dir, fileName);
  fs.writeFileSync(localPath, Buffer.from(fileBuffer));
  var localUrl = require('url').pathToFileURL(localPath).toString();
  return { localPath: localPath, localUrl: localUrl, fileName: fileName };
}

// ============================================
// نظام التخزين المحلي للملفات (Cache)
// ============================================

/**
 * الحصول على مجلد التخزين المحلي للملفات
 */
function getCacheDir(subFolder) {
  var dir = path.join(getDataDir(), 'cache', subFolder || '');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * تحميل ملف من URL وحفظه محلياً
 * يُستخدم لتخزين الخطوط والخلفيات من Supabase Storage
 */
function cacheRemoteFile(remoteUrl, subFolder) {
  var https = require('https');
  var http = require('http');
  
  return new Promise(function(resolve, reject) {
    try {
      if (!remoteUrl || typeof remoteUrl !== 'string') {
        return reject(new Error('Invalid URL'));
      }

      // استخراج اسم الملف من الرابط
      var urlObj = new (require('url').URL)(remoteUrl);
      var urlPath = urlObj.pathname;
      var fileName = path.basename(urlPath);
      if (!fileName || fileName === '/') {
        fileName = 'file_' + Date.now();
      }
      
      var cacheFolder = getCacheDir(subFolder || 'files');
      var localPath = path.join(cacheFolder, fileName);

      // إذا كان الملف موجوداً محلياً، أرجع المسار مباشرة
      if (fs.existsSync(localPath)) {
        return resolve({ localPath: localPath, fileName: fileName, cached: true });
      }

      // تحميل الملف
      var protocol = remoteUrl.startsWith('https') ? https : http;
      
      var request = protocol.get(remoteUrl, function(response) {
        // التعامل مع إعادة التوجيه
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // إعادة محاولة مع الرابط الجديد
          cacheRemoteFile(response.headers.location, subFolder).then(resolve).catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          return reject(new Error('HTTP ' + response.statusCode));
        }

        var fileStream = fs.createWriteStream(localPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', function() {
          fileStream.close();
          resolve({ localPath: localPath, fileName: fileName, cached: false });
        });
        
        fileStream.on('error', function(err) {
          // حذف الملف الناقص
          try { fs.unlinkSync(localPath); } catch(e) {}
          reject(err);
        });
      });

      request.on('error', function(err) {
        reject(err);
      });
      
      // مهلة 15 ثانية
      request.setTimeout(15000, function() {
        request.destroy();
        reject(new Error('Timeout'));
      });
    } catch(err) {
      reject(err);
    }
  });
}

/**
 * التحقق مما إذا كان الملف مخزناً محلياً
 */
function getCachedFilePath(remoteUrl, subFolder) {
  try {
    if (!remoteUrl || typeof remoteUrl !== 'string') return null;
    
    var urlObj = new (require('url').URL)(remoteUrl);
    var urlPath = urlObj.pathname;
    var fileName = path.basename(urlPath);
    if (!fileName || fileName === '/') return null;
    
    var cacheFolder = getCacheDir(subFolder || 'files');
    var localPath = path.join(cacheFolder, fileName);
    
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  } catch(err) {
    return null;
  }
}

/**
 * الحصول على المسار المحلي كـ file:// URL
 */
function getLocalFileUrl(localPath) {
  if (!localPath) return null;
  // تحويل المسار إلى file:// URL
  return require('url').pathToFileURL(localPath).toString();
}

// ============================================
// تصدير الوحدة
// ============================================

module.exports = {
  initializeDatabase: initializeDatabase,
  closeDatabase: closeDatabase,
  getDatabasePath: getDatabasePath,
  generateUUID: generateUUID,
  
  // عمليات CRUD العامة
  getAll: getAll,
  getById: getById,
  insert: insert,
  update: update,
  deleteById: deleteById,
  deleteAll: deleteAll,
  search: search,
  
  // الإعدادات
  getSetting: getSetting,
  setSetting: setSetting,
  getAllSettings: getAllSettings,
  getUserSetting: getUserSetting,
  setUserSetting: setUserSetting,
  getAllUserSettings: getAllUserSettings,
  
  // القوالب
  getTemplateWithFields: getTemplateWithFields,
  getFieldsByTemplateId: getFieldsByTemplateId,
  
  // القوائم المنسدلة
  getDropdownOptionsByType: getDropdownOptionsByType,
  
  // سجل الأنشطة
  deleteOldActivities: deleteOldActivities,
  
  // النسخ الاحتياطي
  exportAllData: exportAllData,
  importAllData: importAllData,
  saveBackupToFolder: saveBackupToFolder,
  listBackups: listBackups,
  loadBackupFromFolder: loadBackupFromFolder,
  deleteBackupFromFolder: deleteBackupFromFolder,
  
  // التخزين المحلي للملفات
  cacheRemoteFile: cacheRemoteFile,
  getCachedFilePath: getCachedFilePath,
  getLocalFileUrl: getLocalFileUrl,
  getCacheDir: getCacheDir,
  saveLocalFile: saveLocalFile
};
