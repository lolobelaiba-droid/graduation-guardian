/**
 * نظام تخزين البيانات باستخدام ملفات JSON
 * يدعم العمل على شبكة محلية بين عدة أجهزة
 * مع آلية قفل الملفات ومسار بيانات مرن
 */

var path = require('path');
var fs = require('fs');
var os = require('os');
var app = require('electron').app;

// مسار مجلد البيانات
var dataDir = null;
var networkConfig = null;
var deviceIdentity = null;

// ============================================
// إعداد هوية الجهاز (IP + Hostname)
// ============================================

function getDeviceIdentity() {
  if (deviceIdentity) return deviceIdentity;
  try {
    var hostname = os.hostname();
    var ip = '127.0.0.1';
    var interfaces = os.networkInterfaces();
    var ifNames = Object.keys(interfaces);
    for (var i = 0; i < ifNames.length; i++) {
      var addrs = interfaces[ifNames[i]];
      for (var j = 0; j < addrs.length; j++) {
        var addr = addrs[j];
        if (addr.family === 'IPv4' && !addr.internal) {
          ip = addr.address;
          break;
        }
      }
      if (ip !== '127.0.0.1') break;
    }
    deviceIdentity = { hostname: hostname, ip: ip };
  } catch (e) {
    deviceIdentity = { hostname: 'unknown', ip: '127.0.0.1' };
  }
  return deviceIdentity;
}

// ============================================
// تحميل إعدادات الشبكة (network-config.json)
// ============================================

function loadNetworkConfig() {
  if (networkConfig !== null) return networkConfig;
  try {
    // البحث في مجلد التطبيق أولاً، ثم مجلد userData
    var candidates = [
      path.join(path.dirname(app.getPath('exe')), 'network-config.json'),
      path.join(app.getPath('userData'), 'network-config.json')
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (fs.existsSync(candidates[i])) {
        var content = fs.readFileSync(candidates[i], 'utf8');
        var cfg = JSON.parse(content);
        if (cfg && cfg.sharedPath && typeof cfg.sharedPath === 'string') {
          // التحقق من إمكانية الوصول للمسار المشترك
          try {
            if (!fs.existsSync(cfg.sharedPath)) {
              fs.mkdirSync(cfg.sharedPath, { recursive: true });
            }
            // اختبار كتابة سريع
            var testFile = path.join(cfg.sharedPath, '.write_test_' + Date.now());
            fs.writeFileSync(testFile, 'test', 'utf8');
            fs.unlinkSync(testFile);
            networkConfig = cfg;
            console.log('[NetworkConfig] Loaded from:', candidates[i]);
            console.log('[NetworkConfig] Shared path:', cfg.sharedPath);
            return networkConfig;
          } catch (accessErr) {
            console.error('[NetworkConfig] Cannot access shared path:', cfg.sharedPath, accessErr.message);
          }
        }
      }
    }
  } catch (e) {
    console.error('[NetworkConfig] Error loading config:', e.message);
  }
  networkConfig = false; // لم يُعثر على إعداد شبكة
  return networkConfig;
}

function isNetworkMode() {
  var cfg = loadNetworkConfig();
  return cfg && cfg.sharedPath;
}

// ============================================
// مسار مجلد البيانات (مرن)
// ============================================

function getDataDir() {
  if (dataDir) return dataDir;
  var cfg = loadNetworkConfig();
  if (cfg && cfg.sharedPath) {
    dataDir = path.join(cfg.sharedPath, 'data');
  } else {
    var userDataPath = app.getPath('userData');
    dataDir = path.join(userDataPath, 'data');
  }
  return dataDir;
}

function getTablePath(tableName) {
  return path.join(getDataDir(), tableName + '.json');
}

function ensureDataDir() {
  var dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================
// آلية قفل الملفات (File Locking)
// ============================================

var LOCK_STALE_MS = 10000;  // 10 ثوانٍ: مدة اعتبار القفل متروكاً
var LOCK_RETRY_MS = 50;     // مللي ثانية بين المحاولات
var LOCK_MAX_RETRIES = 100; // أقصى عدد محاولات (5 ثوانٍ)

function getLockPath(filePath) {
  return filePath + '.lock';
}

/**
 * محاولة الحصول على قفل للملف
 * تُرجع true عند النجاح
 */
function acquireLockSync(filePath) {
  var lockPath = getLockPath(filePath);
  var identity = getDeviceIdentity();
  var lockData = JSON.stringify({
    pid: process.pid,
    hostname: identity.hostname,
    ip: identity.ip,
    timestamp: Date.now()
  });

  for (var attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    try {
      // O_CREAT | O_EXCL: فشل إذا كان الملف موجوداً
      var fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, lockData);
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code === 'EEXIST') {
        // القفل موجود - تحقق من عمره
        try {
          var existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (Date.now() - existing.timestamp > LOCK_STALE_MS) {
            // القفل قديم/متروك، احذفه وأعد المحاولة
            try { fs.unlinkSync(lockPath); } catch (ue) {}
            continue;
          }
        } catch (readErr) {
          // ملف القفل تالف، احذفه
          try { fs.unlinkSync(lockPath); } catch (ue) {}
          continue;
        }
        // انتظر ثم أعد المحاولة
        sleepSync(LOCK_RETRY_MS);
      } else {
        // خطأ آخر (ربما مشكلة صلاحيات)
        console.error('[FileLock] Error acquiring lock:', e.message);
        return false;
      }
    }
  }
  console.error('[FileLock] Failed to acquire lock after ' + LOCK_MAX_RETRIES + ' attempts:', filePath);
  // كمحاولة أخيرة: حذف القفل القديم بالقوة
  try { fs.unlinkSync(getLockPath(filePath)); } catch (e) {}
  return false;
}

/**
 * تحرير القفل
 */
function releaseLockSync(filePath) {
  var lockPath = getLockPath(filePath);
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (e) {
    // تجاهل - ربما حُذف بواسطة عملية أخرى
  }
}

/**
 * انتظار متزامن (blocking sleep)
 */
function sleepSync(ms) {
  var end = Date.now() + ms;
  while (Date.now() < end) {
    // busy wait - مقبول لفترات قصيرة جداً
  }
}

// ============================================
// ذاكرة تخزين مؤقتة للقراءة (Read Cache)
// ============================================

var READ_CACHE_MS = 2000; // 2 ثانية
var CACHED_TABLES = [
  'phd_lmd_certificates', 'phd_science_certificates', 'master_certificates',
  'phd_lmd_students', 'phd_science_students', 'professors',
  'certificate_templates', 'certificate_template_fields',
  'dropdown_options', 'academic_titles', 'custom_fonts'
];
var readCache = {}; // { tableName: { data, timestamp } }

function invalidateCache(tableName) {
  delete readCache[tableName];
}

function invalidateAllCache() {
  readCache = {};
}

// ============================================
// قراءة وكتابة البيانات (مع قفل الملفات)
// ============================================

/**
 * قراءة بيانات جدول (مع تخزين مؤقت للجداول الكبيرة)
 */
function readTable(tableName) {
  // التحقق من الذاكرة المؤقتة
  if (CACHED_TABLES.indexOf(tableName) !== -1) {
    var cached = readCache[tableName];
    if (cached && (Date.now() - cached.timestamp) < READ_CACHE_MS) {
      return cached.data;
    }
  }
  var filePath = getTablePath(tableName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim() === '') return [];
    var parsed = JSON.parse(content);
    // حفظ في الذاكرة المؤقتة
    if (CACHED_TABLES.indexOf(tableName) !== -1) {
      readCache[tableName] = { data: parsed, timestamp: Date.now() };
    }
    return parsed;
  } catch (error) {
    console.error('Error reading table ' + tableName + ':', error);
    // محاولة قراءة من النسخة الاحتياطية
    var bakPath = filePath + '.bak';
    if (fs.existsSync(bakPath)) {
      try {
        var bakContent = fs.readFileSync(bakPath, 'utf8');
        console.log('[Recovery] Loaded backup for ' + tableName);
        return JSON.parse(bakContent);
      } catch (bakErr) {
        console.error('[Recovery] Backup also corrupted for ' + tableName);
      }
    }
    return [];
  }
}

/**
 * كتابة بيانات جدول (مع قفل الملف ونسخة احتياطية)
 */
function writeTable(tableName, data) {
  ensureDataDir();
  var filePath = getTablePath(tableName);
  var locked = false;

  try {
    // الحصول على القفل (في وضع الشبكة فقط أو دائماً للأمان)
    if (isNetworkMode()) {
      locked = acquireLockSync(filePath);
      if (!locked) {
        console.error('[WriteTable] Could not acquire lock for ' + tableName + ', writing anyway...');
      }
    }

    // إنشاء نسخة احتياطية قبل الكتابة
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, filePath + '.bak');
      } catch (bakErr) {
        // تجاهل
      }
    }

    // الكتابة الآمنة: كتابة ملف مؤقت ثم إعادة تسمية (atomic write)
    var tmpPath = filePath + '.tmp.' + process.pid;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
    // تحديث الذاكرة المؤقتة
    invalidateCache(tableName);
    return true;
  } catch (error) {
    console.error('Error writing table ' + tableName + ':', error);
    // تنظيف الملف المؤقت
    try { fs.unlinkSync(filePath + '.tmp.' + process.pid); } catch (e) {}
    return false;
  } finally {
    if (locked) {
      releaseLockSync(filePath);
    }
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

function getCurrentDateTime() {
  return new Date().toISOString();
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// تهيئة قاعدة البيانات
// ============================================

function initializeDatabase() {
  ensureDataDir();
  var identity = getDeviceIdentity();
  var mode = isNetworkMode() ? 'NETWORK (' + networkConfig.sharedPath + ')' : 'LOCAL';
  console.log('[JSON Store] Mode:', mode);
  console.log('[JSON Store] Data dir:', getDataDir());
  console.log('[JSON Store] Device:', identity.hostname, '(' + identity.ip + ')');
  
  var tables = [
    'settings', 'user_settings',
    'phd_lmd_certificates', 'phd_science_certificates', 'master_certificates',
    'certificate_templates', 'certificate_template_fields',
    'custom_fonts', 'dropdown_options', 'activity_log', 'print_history',
    'phd_lmd_students', 'phd_science_students',
    'academic_titles', 'custom_fields', 'custom_field_values', 'custom_field_options',
    'notes', 'professors'
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
  // تنظيف أي ملفات قفل متبقية
  try {
    var dir = getDataDir();
    if (fs.existsSync(dir)) {
      var files = fs.readdirSync(dir);
      files.forEach(function(f) {
        if (f.endsWith('.lock')) {
          try {
            var lockPath = path.join(dir, f);
            var lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            // حذف الأقفال الخاصة بهذه العملية فقط
            if (lockData.pid === process.pid) {
              fs.unlinkSync(lockPath);
            }
          } catch (e) {}
        }
      });
    }
  } catch (e) {}
  console.log('JSON Store closed');
}

function getDatabasePath() {
  return getDataDir();
}

/**
 * الحصول على معلومات وضع الشبكة
 */
function getNetworkInfo() {
  var identity = getDeviceIdentity();
  return {
    isNetwork: !!isNetworkMode(),
    sharedPath: networkConfig ? networkConfig.sharedPath : null,
    hostname: identity.hostname,
    ip: identity.ip
  };
}

// ============================================
// عمليات CRUD العامة
// ============================================

function getAll(tableName, orderBy, orderDir) {
  if (orderBy === undefined) orderBy = 'created_at';
  if (orderDir === undefined) orderDir = 'DESC';
  
  var data = readTable(tableName);
  
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
  for (var key in record) {
    if (record.hasOwnProperty(key)) {
      newRecord[key] = record[key];
    }
  }
  newRecord.id = record.id || generateUUID();
  newRecord.created_at = record.created_at || getCurrentDateTime();
  newRecord.updated_at = getCurrentDateTime();
  
  // إضافة معلومات الجهاز في سجل الأنشطة
  if (tableName === 'activity_log') {
    var identity = getDeviceIdentity();
    newRecord.device_hostname = identity.hostname;
    newRecord.device_ip = identity.ip;
  }
  
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
  
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      data[index][key] = updates[key];
    }
  }
  data[index].updated_at = getCurrentDateTime();
  
  // إضافة معلومات الجهاز المعدِّل في سجل الأنشطة
  if (tableName === 'activity_log') {
    var identity = getDeviceIdentity();
    data[index].device_hostname = identity.hostname;
    data[index].device_ip = identity.ip;
  }
  
  writeTable(tableName, data);
  return data[index];
}

// ============================================
// قفل السجلات (Record Locking) لمنع التعارض
// ============================================

var RECORD_LOCK_STALE_MS = 60000; // 60 ثانية

function acquireRecordLock(tableName, recordId) {
  if (!isNetworkMode()) return { acquired: true };
  
  var lockDir = path.join(getDataDir(), '.record_locks');
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true });
  }
  
  var lockFile = path.join(lockDir, tableName + '_' + recordId + '.lock');
  var identity = getDeviceIdentity();
  var lockData = {
    hostname: identity.hostname,
    ip: identity.ip,
    timestamp: Date.now()
  };
  
  // التحقق من وجود قفل حالي
  if (fs.existsSync(lockFile)) {
    try {
      var existing = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (Date.now() - existing.timestamp < RECORD_LOCK_STALE_MS) {
        // القفل نشط ومن جهاز آخر
        if (existing.hostname !== identity.hostname || existing.ip !== identity.ip) {
          return {
            acquired: false,
            lockedBy: existing.hostname,
            lockedByIp: existing.ip
          };
        }
      }
    } catch (e) {
      // ملف تالف، تابع
    }
  }
  
  // إنشاء القفل
  try {
    fs.writeFileSync(lockFile, JSON.stringify(lockData), 'utf8');
    return { acquired: true };
  } catch (e) {
    return { acquired: true }; // لا نمنع العمل في حالة الخطأ
  }
}

function releaseRecordLock(tableName, recordId) {
  if (!isNetworkMode()) return;
  
  var lockDir = path.join(getDataDir(), '.record_locks');
  var lockFile = path.join(lockDir, tableName + '_' + recordId + '.lock');
  
  try {
    if (fs.existsSync(lockFile)) {
      var identity = getDeviceIdentity();
      var existing = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      // حذف فقط إذا كان القفل لنا
      if (existing.hostname === identity.hostname && existing.ip === identity.ip) {
        fs.unlinkSync(lockFile);
      }
    }
  } catch (e) {
    // تجاهل
  }
}

function checkRecordLock(tableName, recordId) {
  if (!isNetworkMode()) return { locked: false };
  
  var lockDir = path.join(getDataDir(), '.record_locks');
  var lockFile = path.join(lockDir, tableName + '_' + recordId + '.lock');
  
  if (!fs.existsSync(lockFile)) return { locked: false };
  
  try {
    var existing = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    var identity = getDeviceIdentity();
    
    if (Date.now() - existing.timestamp >= RECORD_LOCK_STALE_MS) {
      try { fs.unlinkSync(lockFile); } catch (e) {}
      return { locked: false };
    }
    
    if (existing.hostname === identity.hostname && existing.ip === identity.ip) {
      return { locked: false }; // القفل لنا
    }
    
    return {
      locked: true,
      lockedBy: existing.hostname,
      lockedByIp: existing.ip
    };
  } catch (e) {
    return { locked: false };
  }
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
  var identity = getDeviceIdentity();
  return {
    version: '2.0',
    created_at: getCurrentDateTime(),
    exported_by: identity.hostname + ' (' + identity.ip + ')',
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
      notes: readTable('notes'),
      professors: readTable('professors')
    }
  };
}

/**
 * استخراج الرتبة والاسم النظيف من اسم يحتوي على لقب علمي
 */
function extractRankAndName(fullNameWithRank) {
  var KNOWN_RANKS = [
    { abbr: 'أ.ت.ع', label: 'أستاذ التعليم العالي', pattern: /^أ\.?د\.?\s*/ },
    { abbr: 'أ.ت.ع', label: 'أستاذ التعليم العالي', pattern: /^أد\.?\s*/ },
    { abbr: 'أ.م.أ', label: 'أستاذ محاضر أ', pattern: /^د\.?\s*/ },
    { abbr: 'أ.م.ب', label: 'أستاذ محاضر ب', pattern: /^م\.?ب\.?\s*/ },
    { abbr: 'أ.م.س.أ', label: 'أستاذ مساعد أ', pattern: /^م\.?س\.?أ\.?\s*/ },
    { abbr: 'أ.م.س.ب', label: 'أستاذ مساعد ب', pattern: /^م\.?س\.?ب\.?\s*/ },
  ];

  var trimmed = (fullNameWithRank || '').trim();
  for (var i = 0; i < KNOWN_RANKS.length; i++) {
    var rank = KNOWN_RANKS[i];
    if (rank.pattern.test(trimmed)) {
      var cleanName = trimmed.replace(rank.pattern, '').trim();
      if (cleanName) {
        return { cleanName: cleanName, rankAbbr: rank.abbr, rankLabel: rank.label };
      }
    }
  }
  return { cleanName: trimmed, rankAbbr: '', rankLabel: '' };
}

function rebuildProfessorsFromCertificates(data) {
  var profMap = {};

  function processCerts(certs) {
    if (!certs) return;
    for (var i = 0; i < certs.length; i++) {
      var cert = certs[i];
      if (cert.supervisor_ar) {
        var sup = extractRankAndName(cert.supervisor_ar);
        if (sup.cleanName && !profMap[sup.cleanName]) {
          profMap[sup.cleanName] = { rank_label: sup.rankLabel, rank_abbreviation: sup.rankAbbr, university: cert.supervisor_university || '' };
        }
      }
      if (cert.co_supervisor_ar) {
        var coSup = extractRankAndName(cert.co_supervisor_ar);
        if (coSup.cleanName && !profMap[coSup.cleanName]) {
          profMap[coSup.cleanName] = { rank_label: coSup.rankLabel, rank_abbreviation: coSup.rankAbbr, university: cert.co_supervisor_university || '' };
        }
      }
      if (cert.jury_president_ar) {
        var pres = extractRankAndName(cert.jury_president_ar);
        if (pres.cleanName && !profMap[pres.cleanName]) {
          profMap[pres.cleanName] = { rank_label: pres.rankLabel, rank_abbreviation: pres.rankAbbr, university: '' };
        }
      }
      if (cert.jury_members_ar) {
        var members = cert.jury_members_ar.split(/\s*-\s*/);
        for (var j = 0; j < members.length; j++) {
          var m = members[j].trim();
          if (!m) continue;
          var mem = extractRankAndName(m);
          if (mem.cleanName && !profMap[mem.cleanName]) {
            profMap[mem.cleanName] = { rank_label: mem.rankLabel, rank_abbreviation: mem.rankAbbr, university: '' };
          }
        }
      }
    }
  }

  processCerts(data.phd_lmd_certificates);
  processCerts(data.phd_science_certificates);

  var names = Object.keys(profMap);
  if (names.length === 0) return;

  var existingProfs = readTable('professors') || [];
  var existingNames = {};
  for (var i = 0; i < existingProfs.length; i++) {
    existingNames[existingProfs[i].full_name] = true;
  }

  var newProfs = [];
  for (var k = 0; k < names.length; k++) {
    var name = names[k];
    if (!existingNames[name]) {
      newProfs.push({
        id: generateUUID(),
        full_name: name,
        rank_label: profMap[name].rank_label || null,
        rank_abbreviation: profMap[name].rank_abbreviation || null,
        university: profMap[name].university || null,
        created_at: getCurrentDateTime()
      });
    }
  }

  if (newProfs.length > 0) {
    writeTable('professors', existingProfs.concat(newProfs));
    console.log('Rebuilt ' + newProfs.length + ' professors from certificates');
  }
}

function importAllData(backupData) {
  var data = backupData.data;
  
  var tableNames = [
    'phd_lmd_certificates', 'phd_science_certificates', 'master_certificates',
    'certificate_templates', 'certificate_template_fields',
    'dropdown_options', 'custom_fonts', 'settings', 'user_settings',
    'activity_log', 'phd_lmd_students', 'phd_science_students',
    'academic_titles', 'custom_fields', 'custom_field_values', 'custom_field_options',
    'print_history', 'notes', 'professors'
  ];
  
  tableNames.forEach(function(tableName) {
    if (data[tableName] && data[tableName].length > 0) {
      writeTable(tableName, data[tableName]);
    }
  });
  
  if (!data.professors || data.professors.length === 0) {
    rebuildProfessorsFromCertificates(data);
  }

  if (!data.academic_titles || data.academic_titles.length === 0) {
    var existingTitles = readTable('academic_titles');
    if (!existingTitles || existingTitles.length === 0) {
      var defaultTitles = [
        { id: generateUUID(), abbreviation: 'أ.ت.ع', full_name: 'أستاذ التعليم العالي', display_order: 1, created_at: getCurrentDateTime() },
        { id: generateUUID(), abbreviation: 'أ.م.أ', full_name: 'أستاذ محاضر أ', display_order: 2, created_at: getCurrentDateTime() },
        { id: generateUUID(), abbreviation: 'أ.م.ب', full_name: 'أستاذ محاضر ب', display_order: 3, created_at: getCurrentDateTime() },
        { id: generateUUID(), abbreviation: 'أ.م.س.أ', full_name: 'أستاذ مساعد أ', display_order: 4, created_at: getCurrentDateTime() },
        { id: generateUUID(), abbreviation: 'أ.م.س.ب', full_name: 'أستاذ مساعد ب', display_order: 5, created_at: getCurrentDateTime() },
      ];
      writeTable('academic_titles', defaultTitles);
    }
  }
  
  return { success: true };
}

function saveBackupToFolder(maxCount) {
  var backupData = exportAllData();
  var dir = getBackupsDir();
  var now = new Date();
  var fileName = 'backup_' + now.toISOString().replace(/[:.]/g, '-') + '.json';
  var filePath = path.join(dir, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
  
  var max = maxCount || 10;
  var files = fs.readdirSync(dir)
    .filter(function(f) { return f.endsWith('.json'); })
    .sort()
    .reverse();
  
  if (files.length > max) {
    files.slice(max).forEach(function(f) {
      try { fs.unlinkSync(path.join(dir, f)); } catch(e) {}
    });
  }
  
  return { fileName: fileName, path: filePath, created_at: now.toISOString() };
}

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

function loadBackupFromFolder(fileName) {
  var filePath = path.join(getBackupsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error('ملف النسخة الاحتياطية غير موجود: ' + fileName);
  }
  var content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

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

function saveLocalFile(fileBuffer, fileName, subFolder) {
  var dir = path.join(getDataDir(), 'cache', subFolder || 'files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  var localPath = path.join(dir, fileName);
  var buf = typeof fileBuffer === 'string'
    ? Buffer.from(fileBuffer, 'base64')
    : Buffer.from(fileBuffer);
  fs.writeFileSync(localPath, buf);
  var localUrl = require('url').pathToFileURL(localPath).toString();
  return { localPath: localPath, localUrl: localUrl, fileName: fileName };
}

// ============================================
// نظام التخزين المحلي للملفات (Cache)
// ============================================

function getCacheDir(subFolder) {
  var dir = path.join(getDataDir(), 'cache', subFolder || '');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cacheRemoteFile(remoteUrl, subFolder) {
  var https = require('https');
  var http = require('http');
  
  return new Promise(function(resolve, reject) {
    try {
      if (!remoteUrl || typeof remoteUrl !== 'string') {
        return reject(new Error('Invalid URL'));
      }

      var urlObj = new (require('url').URL)(remoteUrl);
      var urlPath = urlObj.pathname;
      var fileName = path.basename(urlPath);
      if (!fileName || fileName === '/') {
        fileName = 'file_' + Date.now();
      }
      
      var cacheFolder = getCacheDir(subFolder || 'files');
      var localPath = path.join(cacheFolder, fileName);

      if (fs.existsSync(localPath)) {
        return resolve({ localPath: localPath, fileName: fileName, cached: true });
      }

      var protocol = remoteUrl.startsWith('https') ? https : http;
      
      var request = protocol.get(remoteUrl, function(response) {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
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
          try { fs.unlinkSync(localPath); } catch(e) {}
          reject(err);
        });
      });

      request.on('error', function(err) {
        reject(err);
      });
      
      request.setTimeout(15000, function() {
        request.destroy();
        reject(new Error('Timeout'));
      });
    } catch(err) {
      reject(err);
    }
  });
}

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

function getLocalFileUrl(localPath) {
  if (!localPath) return null;
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
  getNetworkInfo: getNetworkInfo,
  
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
