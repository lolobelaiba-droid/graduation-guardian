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
    'custom_field_options'
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
      return data[i];
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
  return readTable('user_settings');
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
      print_history: readTable('print_history')
    }
  };
}

function importAllData(backupData) {
  var data = backupData.data;
  
  // قائمة بجميع الجداول القابلة للاستيراد
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
    'print_history'
  ];
  
  tableNames.forEach(function(tableName) {
    if (data[tableName]) {
      writeTable(tableName, data[tableName]);
    }
  });
  
  return { success: true };
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
  importAllData: importAllData
};
