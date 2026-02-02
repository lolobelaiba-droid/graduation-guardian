/**
 * نظام تخزين البيانات باستخدام ملفات JSON
 * بديل عن better-sqlite3 لتجنب مشاكل البناء مع Native modules
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// مسار مجلد البيانات
let dataDir = null;

/**
 * الحصول على مسار مجلد البيانات
 */
function getDataDir() {
  if (dataDir) return dataDir;
  const userDataPath = app.getPath('userData');
  dataDir = path.join(userDataPath, 'data');
  return dataDir;
}

/**
 * الحصول على مسار ملف جدول معين
 */
function getTablePath(tableName) {
  return path.join(getDataDir(), `${tableName}.json`);
}

/**
 * التأكد من وجود مجلد البيانات
 */
function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * قراءة بيانات جدول
 */
function readTable(tableName) {
  const filePath = getTablePath(tableName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading table ${tableName}:`, error);
    return [];
  }
}

/**
 * كتابة بيانات جدول
 */
function writeTable(tableName, data) {
  ensureDataDir();
  const filePath = getTablePath(tableName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing table ${tableName}:`, error);
    return false;
  }
}

/**
 * توليد UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
  const tables = [
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
    'print_history'
  ];
  
  tables.forEach(table => {
    const filePath = getTablePath(table);
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

function getAll(tableName, orderBy = 'created_at', orderDir = 'DESC') {
  const data = readTable(tableName);
  
  // ترتيب البيانات
  return data.sort((a, b) => {
    const aVal = a[orderBy] || '';
    const bVal = b[orderBy] || '';
    
    if (orderDir.toUpperCase() === 'ASC') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

function getById(tableName, id) {
  const data = readTable(tableName);
  return data.find(item => item.id === id) || null;
}

function insert(tableName, record) {
  const data = readTable(tableName);
  
  const newRecord = {
    ...record,
    id: record.id || generateUUID(),
    created_at: record.created_at || getCurrentDateTime(),
    updated_at: getCurrentDateTime()
  };
  
  data.push(newRecord);
  writeTable(tableName, data);
  
  return newRecord;
}

function update(tableName, id, updates) {
  const data = readTable(tableName);
  const index = data.findIndex(item => item.id === id);
  
  if (index === -1) {
    return null;
  }
  
  data[index] = {
    ...data[index],
    ...updates,
    updated_at: getCurrentDateTime()
  };
  
  writeTable(tableName, data);
  return data[index];
}

function deleteById(tableName, id) {
  const data = readTable(tableName);
  const filtered = data.filter(item => item.id !== id);
  writeTable(tableName, filtered);
  return { changes: data.length - filtered.length };
}

function deleteAll(tableName) {
  writeTable(tableName, []);
  return { changes: 1 };
}

function search(tableName, column, query) {
  const data = readTable(tableName);
  const lowerQuery = query.toLowerCase();
  
  return data.filter(item => {
    const value = item[column];
    if (typeof value === 'string') {
      return value.toLowerCase().includes(lowerQuery);
    }
    return false;
  });
}

// ============================================
// عمليات خاصة بالإعدادات
// ============================================

function getSetting(key) {
  const data = readTable('settings');
  return data.find(item => item.key === key) || null;
}

function setSetting(key, value) {
  const data = readTable('settings');
  const index = data.findIndex(item => item.key === key);
  
  if (index !== -1) {
    data[index].value = value;
    data[index].updated_at = getCurrentDateTime();
  } else {
    data.push({
      id: generateUUID(),
      key,
      value,
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
  const data = readTable('user_settings');
  return data.find(item => item.setting_key === key) || null;
}

function setUserSetting(key, value) {
  const data = readTable('user_settings');
  const index = data.findIndex(item => item.setting_key === key);
  
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  
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
  const template = getById('certificate_templates', templateId);
  if (!template) return null;
  
  const allFields = readTable('certificate_template_fields');
  const fields = allFields
    .filter(f => f.template_id === templateId)
    .sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
  
  return {
    ...template,
    certificate_template_fields: fields
  };
}

function getFieldsByTemplateId(templateId) {
  const allFields = readTable('certificate_template_fields');
  return allFields
    .filter(f => f.template_id === templateId)
    .sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
}

// ============================================
// عمليات خاصة بخيارات القوائم المنسدلة
// ============================================

function getDropdownOptionsByType(optionType) {
  const allOptions = readTable('dropdown_options');
  return allOptions
    .filter(o => o.option_type === optionType)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

// ============================================
// عمليات النسخ الاحتياطي والاستعادة
// ============================================

function exportAllData() {
  return {
    version: '1.0',
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
    }
  };
}

function importAllData(backupData) {
  const { data } = backupData;
  
  // حذف البيانات الحالية وإعادة الكتابة
  if (data.phd_lmd_certificates) {
    writeTable('phd_lmd_certificates', data.phd_lmd_certificates);
  }
  
  if (data.phd_science_certificates) {
    writeTable('phd_science_certificates', data.phd_science_certificates);
  }
  
  if (data.master_certificates) {
    writeTable('master_certificates', data.master_certificates);
  }
  
  if (data.certificate_templates) {
    writeTable('certificate_templates', data.certificate_templates);
  }
  
  if (data.certificate_template_fields) {
    writeTable('certificate_template_fields', data.certificate_template_fields);
  }
  
  if (data.dropdown_options) {
    writeTable('dropdown_options', data.dropdown_options);
  }
  
  if (data.custom_fonts) {
    writeTable('custom_fonts', data.custom_fonts);
  }
  
  if (data.settings) {
    writeTable('settings', data.settings);
  }
  
  if (data.user_settings) {
    writeTable('user_settings', data.user_settings);
  }
  
  return { success: true };
}

// ============================================
// تصدير الوحدة
// ============================================

module.exports = {
  initializeDatabase,
  closeDatabase,
  getDatabasePath,
  generateUUID,
  
  // عمليات CRUD العامة
  getAll,
  getById,
  insert,
  update,
  deleteById,
  deleteAll,
  search,
  
  // الإعدادات
  getSetting,
  setSetting,
  getAllSettings,
  getUserSetting,
  setUserSetting,
  getAllUserSettings,
  
  // القوالب
  getTemplateWithFields,
  getFieldsByTemplateId,
  
  // القوائم المنسدلة
  getDropdownOptionsByType,
  
  // النسخ الاحتياطي
  exportAllData,
  importAllData,
};
