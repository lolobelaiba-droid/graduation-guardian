/**
 * وحدة إدارة قاعدة البيانات SQLite
 * تستخدم في الوضع المحلي (Electron)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

/**
 * الحصول على مسار قاعدة البيانات
 */
function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'certificates.db');
}

/**
 * تهيئة قاعدة البيانات
 */
function initializeDatabase() {
  if (db) return db;

  const dbPath = getDatabasePath();
  console.log('Database path:', dbPath);

  // إنشاء المجلد إذا لم يكن موجوداً
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // فتح قاعدة البيانات
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // قراءة وتنفيذ schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  console.log('Database initialized successfully');
  return db;
}

/**
 * إغلاق قاعدة البيانات
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
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

// ============================================
// عمليات CRUD العامة
// ============================================

/**
 * الحصول على جميع السجلات من جدول
 */
function getAll(tableName, orderBy = 'created_at', orderDir = 'DESC') {
  const stmt = db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy} ${orderDir}`);
  return stmt.all();
}

/**
 * الحصول على سجل واحد بالمعرف
 */
function getById(tableName, id) {
  const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
  return stmt.get(id);
}

/**
 * إضافة سجل جديد
 */
function insert(tableName, data) {
  const id = data.id || generateUUID();
  const dataWithId = { ...data, id };
  
  const columns = Object.keys(dataWithId).join(', ');
  const placeholders = Object.keys(dataWithId).map(() => '?').join(', ');
  const values = Object.values(dataWithId);
  
  const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
  stmt.run(...values);
  
  return getById(tableName, id);
}

/**
 * تحديث سجل
 */
function update(tableName, id, data) {
  const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(data), id];
  
  const stmt = db.prepare(`UPDATE ${tableName} SET ${updates}, updated_at = datetime('now') WHERE id = ?`);
  stmt.run(...values);
  
  return getById(tableName, id);
}

/**
 * حذف سجل
 */
function deleteById(tableName, id) {
  const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
  return stmt.run(id);
}

/**
 * حذف جميع السجلات من جدول
 */
function deleteAll(tableName) {
  const stmt = db.prepare(`DELETE FROM ${tableName}`);
  return stmt.run();
}

/**
 * البحث في جدول
 */
function search(tableName, column, query) {
  const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE ${column} LIKE ?`);
  return stmt.all(`%${query}%`);
}

// ============================================
// عمليات خاصة بالإعدادات
// ============================================

function getSetting(key) {
  const stmt = db.prepare('SELECT * FROM settings WHERE key = ?');
  return stmt.get(key);
}

function setSetting(key, value) {
  const existing = getSetting(key);
  if (existing) {
    const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?');
    stmt.run(value, key);
  } else {
    const stmt = db.prepare('INSERT INTO settings (id, key, value) VALUES (?, ?, ?)');
    stmt.run(generateUUID(), key, value);
  }
  return getSetting(key);
}

function getAllSettings() {
  const stmt = db.prepare('SELECT * FROM settings');
  return stmt.all();
}

// ============================================
// عمليات خاصة بإعدادات المستخدم
// ============================================

function getUserSetting(key) {
  const stmt = db.prepare('SELECT * FROM user_settings WHERE setting_key = ?');
  return stmt.get(key);
}

function setUserSetting(key, value) {
  const existing = getUserSetting(key);
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (existing) {
    const stmt = db.prepare('UPDATE user_settings SET setting_value = ?, updated_at = datetime("now") WHERE setting_key = ?');
    stmt.run(jsonValue, key);
  } else {
    const stmt = db.prepare('INSERT INTO user_settings (id, setting_key, setting_value) VALUES (?, ?, ?)');
    stmt.run(generateUUID(), key, jsonValue);
  }
  return getUserSetting(key);
}

function getAllUserSettings() {
  const stmt = db.prepare('SELECT * FROM user_settings');
  return stmt.all();
}

// ============================================
// عمليات خاصة بالقوالب مع الحقول
// ============================================

function getTemplateWithFields(templateId) {
  const template = getById('certificate_templates', templateId);
  if (!template) return null;
  
  const stmt = db.prepare('SELECT * FROM certificate_template_fields WHERE template_id = ? ORDER BY field_order');
  const fields = stmt.all(templateId);
  
  return {
    ...template,
    certificate_template_fields: fields
  };
}

function getFieldsByTemplateId(templateId) {
  const stmt = db.prepare('SELECT * FROM certificate_template_fields WHERE template_id = ? ORDER BY field_order');
  return stmt.all(templateId);
}

// ============================================
// عمليات خاصة بخيارات القوائم المنسدلة
// ============================================

function getDropdownOptionsByType(optionType) {
  const stmt = db.prepare('SELECT * FROM dropdown_options WHERE option_type = ? ORDER BY display_order');
  return stmt.all(optionType);
}

// ============================================
// عمليات النسخ الاحتياطي والاستعادة
// ============================================

function exportAllData() {
  return {
    version: '1.0',
    created_at: new Date().toISOString(),
    data: {
      phd_lmd_certificates: getAll('phd_lmd_certificates'),
      phd_science_certificates: getAll('phd_science_certificates'),
      master_certificates: getAll('master_certificates'),
      certificate_templates: getAll('certificate_templates'),
      certificate_template_fields: getAll('certificate_template_fields', 'template_id'),
      settings: getAllSettings(),
      user_settings: getAllUserSettings(),
      dropdown_options: getAll('dropdown_options', 'display_order', 'ASC'),
      custom_fonts: getAll('custom_fonts'),
      activity_log: getAll('activity_log'),
    }
  };
}

function importAllData(backupData) {
  const transaction = db.transaction(() => {
    const { data } = backupData;
    
    // حذف البيانات الحالية (بالترتيب الصحيح بسبب المفاتيح الأجنبية)
    deleteAll('certificate_template_fields');
    deleteAll('certificate_templates');
    deleteAll('phd_lmd_certificates');
    deleteAll('phd_science_certificates');
    deleteAll('master_certificates');
    deleteAll('dropdown_options');
    deleteAll('custom_fonts');
    deleteAll('print_history');
    
    // إعادة إدراج البيانات
    if (data.phd_lmd_certificates) {
      for (const record of data.phd_lmd_certificates) {
        insert('phd_lmd_certificates', record);
      }
    }
    
    if (data.phd_science_certificates) {
      for (const record of data.phd_science_certificates) {
        insert('phd_science_certificates', record);
      }
    }
    
    if (data.master_certificates) {
      for (const record of data.master_certificates) {
        insert('master_certificates', record);
      }
    }
    
    if (data.certificate_templates) {
      for (const record of data.certificate_templates) {
        insert('certificate_templates', record);
      }
    }
    
    if (data.certificate_template_fields) {
      for (const record of data.certificate_template_fields) {
        insert('certificate_template_fields', record);
      }
    }
    
    if (data.dropdown_options) {
      for (const record of data.dropdown_options) {
        insert('dropdown_options', record);
      }
    }
    
    if (data.custom_fonts) {
      for (const record of data.custom_fonts) {
        insert('custom_fonts', record);
      }
    }
    
    if (data.settings) {
      for (const record of data.settings) {
        setSetting(record.key, record.value);
      }
    }
    
    if (data.user_settings) {
      for (const record of data.user_settings) {
        setUserSetting(record.setting_key, record.setting_value);
      }
    }
  });
  
  transaction();
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
