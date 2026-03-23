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
// إعداد هوية الجهاز (UUID + IP + Hostname)
// ============================================

/**
 * الحصول على أو توليد معرّف فريد ثابت للجهاز (Device UUID)
 * يُحفظ في مجلد userData المحلي ولا يتأثر بتغيّر IP أو Hostname
 */
function getOrCreateDeviceUUID() {
  var deviceIdPath = path.join(app.getPath('userData'), 'device-id.json');
  try {
    if (fs.existsSync(deviceIdPath)) {
      var content = fs.readFileSync(deviceIdPath, 'utf8');
      var parsed = JSON.parse(content);
      if (parsed && parsed.uuid) {
        return parsed.uuid;
      }
    }
  } catch (e) {
    console.error('[DeviceUUID] Error reading device-id.json:', e.message);
  }

  // توليد UUID جديد عند أول تشغيل
  var crypto = require('crypto');
  var newUUID = crypto.randomUUID ? crypto.randomUUID() : 
    ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
      return (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16);
    });

  try {
    var deviceData = {
      uuid: newUUID,
      createdAt: new Date().toISOString(),
      initialHostname: os.hostname()
    };
    fs.writeFileSync(deviceIdPath, JSON.stringify(deviceData, null, 2), 'utf8');
    console.log('[DeviceUUID] Generated new Device UUID:', newUUID);
  } catch (e) {
    console.error('[DeviceUUID] Error saving device-id.json:', e.message);
  }

  return newUUID;
}

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
    var deviceUUID = getOrCreateDeviceUUID();
    deviceIdentity = { device_id: deviceUUID, hostname: hostname, ip: ip };
  } catch (e) {
    deviceIdentity = { device_id: 'unknown', hostname: 'unknown', ip: '127.0.0.1' };
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
  'dropdown_options', 'academic_titles', 'custom_fonts',
  'defense_document_templates'
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
// البيانات الافتراضية لقوالب وثائق المناقشة
// ============================================

function seedDefenseDocTemplates() {
  try {
    var existing = readTable('defense_document_templates');
    if (existing && existing.length > 0) return;

    var now = getCurrentDateTime();
    var defaults = [
      {
        id: generateUUID(),
        document_type: 'jury_decision_lmd',
        title: 'مقرر تعيين لجنة المناقشة - دكتوراه ل م د',
        content: '<div style="text-align: center; margin-bottom: 24px;"><p style="font-size: 16px; font-weight: bold; margin: 0;">الجمهورية الجزائرية الديمقراطية الشعبية</p><p style="margin: 4px 0;">وزارة التعليم العالي والبحث العلمي</p><p style="font-weight: bold; margin: 4px 0;">{{university_ar}}</p></div><p style="text-align: center; font-weight: bold; font-size: 15px; margin: 24px 0; text-decoration: underline;">مقرر رقم {{decision_number}} مؤرخ في {{decision_date}} يتضمن تعيين لجنة مناقشة أطروحة الدكتوراه.</p><p style="text-align: right; margin-bottom: 12px;">- إن مدير {{university_ar}}،</p><p style="text-align: justify;">- وبناء على اقتراح المجلس العلمي لكلية {{faculty_ar}} المثبت بموجب محضر اجتماعه المنعقد بتاريخ {{scientific_council_date}}،</p><p style="text-align: center; font-weight: bold; margin: 16px 0;">يقرر ما يأتي:</p><p style="text-align: justify;"><b>المادة الأولى:</b> يُعيَّن بموجب هذا المقرر لجنة مناقشة أطروحة الدكتوراه للطالب (ة): <b>{{full_name_ar}}</b>، المولود (ة) بتاريخ: {{date_of_birth}} بـ: {{birthplace_ar}} – {{province}}، والموسومة بـ: <b>{{thesis_title_ar}}</b></p><p style="text-align: justify;">والمسجّل(ة) بكلية {{faculty_ar}}</p><p style="text-align: justify;"><b>المادة 2:</b> تتشكّل اللجنة المشار إليها في المادة الأولى من الأعضاء الآتي ذكرهم:</p><p>{{jury_table}}</p><p style="text-align: justify;"><b>المادة 3:</b> يُكلَّف عميد كلية {{faculty_ar}} بتنفيذ هذا المقرر.</p><p style="text-align: left; margin-top: 30px;">حُرر بـ{{province}}، في: {{decision_date}}</p><p style="text-align: left; margin-top: 20px; font-weight: bold;">{{signature_title}}</p>',
        font_family: 'IBM Plex Sans Arabic', font_size: 14, line_height: 1.8,
        margin_top: 20, margin_bottom: 20, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      },
      {
        id: generateUUID(),
        document_type: 'jury_decision_science',
        title: 'مقرر تعيين لجنة المناقشة - دكتوراه علوم',
        content: '<div style="text-align: center; margin-bottom: 24px;"><p style="font-size: 16px; font-weight: bold; margin: 0;">الجمهورية الجزائرية الديمقراطية الشعبية</p><p style="margin: 4px 0;">وزارة التعليم العالي والبحث العلمي</p><p style="font-weight: bold; margin: 4px 0;">{{university_ar}}</p></div><p style="text-align: center; font-weight: bold; font-size: 15px; margin: 24px 0; text-decoration: underline;">مقرر رقم {{decision_number}} مؤرخ في {{decision_date}} يتضمن تعيين لجنة مناقشة أطروحة الدكتوراه.</p><p style="text-align: right; margin-bottom: 12px;">- إن مدير {{university_ar}}،</p><p style="text-align: justify;">- وبناء على اقتراح المجلس العلمي لكلية {{faculty_ar}} المثبت بموجب محضر اجتماعه المنعقد بتاريخ {{scientific_council_date}}،</p><p style="text-align: center; font-weight: bold; margin: 16px 0;">يقرر ما يأتي:</p><p style="text-align: justify;"><b>المادة الأولى:</b> يُعيَّن بموجب هذا المقرر لجنة مناقشة أطروحة الدكتوراه للطالب (ة): <b>{{full_name_ar}}</b>، المولود (ة) بتاريخ: {{date_of_birth}} بـ: {{birthplace_ar}} – {{province}}، والموسومة بـ: <b>{{thesis_title_ar}}</b></p><p style="text-align: justify;">والمسجّل(ة) بكلية {{faculty_ar}}</p><p style="text-align: justify;"><b>المادة 2:</b> تتشكّل اللجنة المشار إليها في المادة الأولى من الأعضاء الآتي ذكرهم:</p><p>{{jury_table}}</p><p style="text-align: justify;"><b>المادة 3:</b> يُكلَّف عميد كلية {{faculty_ar}} بتنفيذ هذا المقرر.</p><p style="text-align: left; margin-top: 30px;">حُرر بـ{{province}}، في: {{decision_date}}</p><p style="text-align: left; margin-top: 20px; font-weight: bold;">{{signature_title}}</p>',
        font_family: 'IBM Plex Sans Arabic', font_size: 14, line_height: 1.8,
        margin_top: 20, margin_bottom: 20, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      },
      {
        id: generateUUID(),
        document_type: 'defense_auth_lmd',
        title: 'الترخيص بالمناقشة - دكتوراه ل م د',
        content: '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div><div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div><div style="text-align: center;">{{university_ar}}</div><div style="text-align: center;">{{faculty_ar}}</div><br/><div style="text-align: center; font-weight: bold; font-size: 20px;">ترخيص بالمناقشة</div><div style="text-align: center;">دكتوراه الطور الثالث (ل م د)</div><br/><div>يرخص للطالب(ة): {{full_name_ar}}</div><div>المولود(ة) في: {{date_of_birth}} بـ {{birthplace_ar}}</div><div>رقم التسجيل: {{registration_number}}</div><div>الميدان: {{field_ar}}</div><div>الفرع: {{branch_ar}}</div><div>التخصص: {{specialty_ar}}</div><br/><div>بمناقشة أطروحته(ا) الموسومة بـ:</div><div style="font-weight: bold; text-align: center;">{{thesis_title_ar}}</div><br/><div>تحت إشراف: {{supervisor_ar}}</div><div>تاريخ المناقشة: {{defense_date}}</div><br/><div style="font-weight: bold;">أمام اللجنة المكونة من:</div><p>{{jury_table}}</p><br/><div style="text-align: left;">{{signature_title}}</div>',
        font_family: 'IBM Plex Sans Arabic', font_size: 14, line_height: 1.8,
        margin_top: 20, margin_bottom: 20, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      },
      {
        id: generateUUID(),
        document_type: 'defense_auth_science',
        title: 'الترخيص بالمناقشة - دكتوراه علوم',
        content: '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div><div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div><div style="text-align: center;">{{university_ar}}</div><div style="text-align: center;">{{faculty_ar}}</div><br/><div style="text-align: center; font-weight: bold; font-size: 20px;">ترخيص بالمناقشة</div><div style="text-align: center;">دكتوراه علوم</div><br/><div>يرخص للطالب(ة): {{full_name_ar}}</div><div>المولود(ة) في: {{date_of_birth}} بـ {{birthplace_ar}}</div><div>رقم التسجيل: {{registration_number}}</div><div>الميدان: {{field_ar}}</div><div>الفرع: {{branch_ar}}</div><div>التخصص: {{specialty_ar}}</div><br/><div>بمناقشة أطروحته(ا) الموسومة بـ:</div><div style="font-weight: bold; text-align: center;">{{thesis_title_ar}}</div><br/><div>تحت إشراف: {{supervisor_ar}}</div><div>تاريخ المناقشة: {{defense_date}}</div><br/><div style="font-weight: bold;">أمام اللجنة المكونة من:</div><p>{{jury_table}}</p><br/><div style="text-align: left;">{{signature_title}}</div>',
        font_family: 'IBM Plex Sans Arabic', font_size: 14, line_height: 1.8,
        margin_top: 20, margin_bottom: 20, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      },
      {
        id: generateUUID(),
        document_type: 'defense_minutes_lmd',
        title: 'محضر مداولات لجنة المناقشة - دكتوراه ل م د',
        content: '<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px;">الجمهورية الجزائرية الديمقراطية الشعبية</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 14px;">وزارة التعليم العالي والبحث العلمي</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 15px;">{{university_ar}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl;">رقم: {{minutes_number}}/ {{minutes_year}}</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px; text-decoration: underline;">محضر مداولات لجنة مناقشة أطروحة الدكتوراه</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl;">في يوم: {{defense_date}} على الساعة: {{defense_time}} بـ{{university_ar}}</p><p style="text-align: right; direction: rtl;">ناقش(ت) علنـــا الطالـــب(ة): {{full_name_ar}}</p><p style="text-align: right; direction: rtl;">المولـــود(ة) بتاريـــخ: {{date_of_birth}} بـ: {{birthplace_ar}} - {{province}}</p><p style="text-align: right; direction: rtl;">أطروحة الدكتوراه لنيـــل شهـــادة: دكتوراه ل م د</p><p style="text-align: right; direction: rtl;">الشعبة: {{branch_ar}}</p><p style="text-align: right; direction: rtl;">التخصـــص: {{specialty_ar}}</p><p style="text-align: right; direction: rtl;">عنوان أطروحة الدكتوراه: {{thesis_title_ar}}</p><p style="text-align: right; direction: rtl;">{{thesis_title_fr}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">أمـــام اللجنـــة المكونـــة مـــن:</p><p style="text-align: right; direction: rtl;">{{jury_table_with_signature}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">ملاحظات:</p><p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p><p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">بعد المناقشة العلنية و المداولات السرية تقترح اللجنة منح المترشح(ة) شهادة الدكتوراه بتقدير: {{mention}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: left; direction: rtl;">رئيس اللجنة</p>',
        font_family: 'IBM Plex Sans Arabic', font_size: 13, line_height: 1.8,
        margin_top: 15, margin_bottom: 15, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      },
      {
        id: generateUUID(),
        document_type: 'defense_minutes_science',
        title: 'محضر مداولات لجنة المناقشة - دكتوراه علوم',
        content: '<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px;">الجمهورية الجزائرية الديمقراطية الشعبية</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 14px;">وزارة التعليم العالي والبحث العلمي</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 15px;">{{university_ar}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl;">رقم: {{minutes_number}}/ {{minutes_year}}</p><p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px; text-decoration: underline;">محضر مداولات لجنة مناقشة أطروحة الدكتوراه</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl;">في يوم: {{defense_date}} على الساعة: {{defense_time}} بـ{{university_ar}}</p><p style="text-align: right; direction: rtl;">ناقش(ت) علنـــا الطالـــب(ة): {{full_name_ar}}</p><p style="text-align: right; direction: rtl;">المولـــود(ة) بتاريـــخ: {{date_of_birth}} بـ: {{birthplace_ar}} - {{province}}</p><p style="text-align: right; direction: rtl;">أطروحة الدكتوراه لنيـــل شهـــادة: دكتوراه علوم</p><p style="text-align: right; direction: rtl;">الشعبة: {{branch_ar}}</p><p style="text-align: right; direction: rtl;">التخصـــص: {{specialty_ar}}</p><p style="text-align: right; direction: rtl;">عنوان أطروحة الدكتوراه: {{thesis_title_ar}}</p><p style="text-align: right; direction: rtl;">{{thesis_title_fr}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">أمـــام اللجنـــة المكونـــة مـــن:</p><p style="text-align: right; direction: rtl;">{{jury_table_with_signature}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">ملاحظات:</p><p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p><p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: right; direction: rtl; font-weight: bold;">بعد المناقشة العلنية و المداولات السرية تقترح اللجنة منح المترشح(ة) شهادة الدكتوراه بتقدير: {{mention}}</p><p style="text-align: right; direction: rtl;">&nbsp;</p><p style="text-align: left; direction: rtl;">رئيس اللجنة</p>',
        font_family: 'IBM Plex Sans Arabic', font_size: 13, line_height: 1.8,
        margin_top: 15, margin_bottom: 15, margin_right: 20, margin_left: 20,
        custom_variables: '[]', jury_table_settings: '{}', text_boxes: '[]',
        created_at: now, updated_at: now
      }
    ];

    writeTable('defense_document_templates', defaults);
    console.log('[JSON Store] Seeded defense_document_templates with', defaults.length, 'templates');
  } catch (e) {
    console.error('[JSON Store] Error seeding defense_document_templates:', e.message);
  }
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
    'notes', 'professors',
    'defense_document_templates',
    'defense_stage_lmd', 'defense_stage_science'
  ];
  
  tables.forEach(function(table) {
    var filePath = getTablePath(table);
    if (!fs.existsSync(filePath)) {
      writeTable(table, []);
    }
  });
  
  // إدراج قوالب وثائق المناقشة الافتراضية إذا كان الجدول فارغاً
  seedDefenseDocTemplates();
  
  // تسجيل الجهاز في سجل الأجهزة عند التشغيل
  if (isNetworkMode()) {
    try { updateDeviceRegistry(); } catch (e) {}
  }
  
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
    device_id: identity.device_id,
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
    newRecord.device_id = identity.device_id;
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
    data[index].device_id = identity.device_id;
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
    device_id: identity.device_id,
    hostname: identity.hostname,
    ip: identity.ip,
    timestamp: Date.now()
  };
  
  // التحقق من وجود قفل حالي
  if (fs.existsSync(lockFile)) {
    try {
      var existing = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (Date.now() - existing.timestamp < RECORD_LOCK_STALE_MS) {
        // القفل نشط ومن جهاز آخر (التحقق بالـ device_id أولاً)
        var isSameDevice = existing.device_id ? 
          (existing.device_id === identity.device_id) : 
          (existing.hostname === identity.hostname && existing.ip === identity.ip);
        if (!isSameDevice) {
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
      var isSameDevice = existing.device_id ? 
        (existing.device_id === identity.device_id) : 
        (existing.hostname === identity.hostname && existing.ip === identity.ip);
      if (isSameDevice) {
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
    
    var isSameDevice = existing.device_id ? 
      (existing.device_id === identity.device_id) : 
      (existing.hostname === identity.hostname && existing.ip === identity.ip);
    if (isSameDevice) {
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
      professors: readTable('professors'),
      defense_document_templates: readTable('defense_document_templates'),
      defense_stage_lmd: readTable('defense_stage_lmd'),
      defense_stage_science: readTable('defense_stage_science')
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
    'print_history', 'notes', 'professors',
    'defense_document_templates', 'defense_stage_lmd', 'defense_stage_science'
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
// إدارة الشبكة والأجهزة
// ============================================

/**
 * حفظ أو تحديث ملف network-config.json
 */
function saveNetworkConfig(sharedPath) {
  var configPath = path.join(app.getPath('userData'), 'network-config.json');
  var cfg = { sharedPath: sharedPath };
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  // إعادة تحميل الإعدادات
  networkConfig = null;
  dataDir = null;
  deviceIdentity = null;
  loadNetworkConfig();
  return { success: true, path: configPath };
}

/**
 * اختبار إمكانية الوصول والكتابة في مسار مشترك
 */
function testNetworkPath(testPath) {
  try {
    if (!fs.existsSync(testPath)) {
      return { reachable: false, writable: false, error: 'المسار غير موجود' };
    }
    // اختبار كتابة
    var testFile = path.join(testPath, '.write_test_' + Date.now());
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);
    return { reachable: true, writable: true };
  } catch (e) {
    return { reachable: fs.existsSync(testPath), writable: false, error: e.message };
  }
}

/**
 * تحديث سجل الأجهزة (device_registry.json) — مع حماية من التعارض
 */
function updateDeviceRegistry() {
  var identity = getDeviceIdentity();
  var registryPath = path.join(getDataDir(), 'device_registry.json');
  var registry = [];

  // قراءة السجل الحالي بأمان
  try {
    if (fs.existsSync(registryPath)) {
      var content = fs.readFileSync(registryPath, 'utf8');
      if (content && content.trim()) {
        registry = JSON.parse(content);
      }
    }
  } catch (e) {
    registry = [];
  }

  // تحديث أو إضافة الجهاز الحالي (باستخدام device_id كمعرّف أساسي)
  var now = new Date().toISOString();
  var found = false;
  for (var i = 0; i < registry.length; i++) {
    // البحث بالـ device_id أولاً (الأكثر موثوقية)، ثم بالـ hostname+ip للتوافق مع السجلات القديمة
    if (registry[i].device_id === identity.device_id || 
        (!registry[i].device_id && registry[i].ip === identity.ip && registry[i].hostname === identity.hostname)) {
      // تحديث كل المعلومات (الـ IP والـ Hostname قد يتغيران)
      registry[i].device_id = identity.device_id;
      registry[i].hostname = identity.hostname;
      registry[i].ip = identity.ip;
      registry[i].lastActive = now;
      found = true;
      break;
    }
  }
  if (!found) {
    registry.push({
      device_id: identity.device_id,
      hostname: identity.hostname,
      ip: identity.ip,
      firstSeen: now,
      lastActive: now
    });
  }

  // كتابة ذرية باستخدام ملف مؤقت
  try {
    var tmpPath = registryPath + '.tmp.' + process.pid;
    fs.writeFileSync(tmpPath, JSON.stringify(registry, null, 2), 'utf8');
    fs.renameSync(tmpPath, registryPath);
  } catch (e) {
    // تنظيف
    try { fs.unlinkSync(registryPath + '.tmp.' + process.pid); } catch (ue) {}
  }

  return registry;
}

/**
 * قراءة سجل الأجهزة
 */
function getDeviceRegistry() {
  var registryPath = path.join(getDataDir(), 'device_registry.json');
  try {
    if (fs.existsSync(registryPath)) {
      var content = fs.readFileSync(registryPath, 'utf8');
      if (content && content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (e) {}
  return [];
}

/**
 * حفظ الأسماء المستعارة للأجهزة
 */
function saveDeviceAliases(aliases) {
  setSetting('device_aliases', JSON.stringify(aliases));
  return { success: true };
}

/**
 * جلب الأسماء المستعارة للأجهزة
 */
function getDeviceAliases() {
  var setting = getSetting('device_aliases');
  if (setting && setting.value) {
    try {
      return JSON.parse(setting.value);
    } catch (e) {}
  }
  return {};
}

/**
 * نسخ احتياطي مركزي — نسخ المسار المشترك إلى مجلد محلي
 */
function centralizedBackup() {
  if (!isNetworkMode()) {
    return { success: false, error: 'غير متصل بالشبكة' };
  }

  var identity = getDeviceIdentity();
  var localBackupBase = path.join(app.getPath('userData'), 'centralized_backups');
  if (!fs.existsSync(localBackupBase)) {
    fs.mkdirSync(localBackupBase, { recursive: true });
  }

  var now = new Date();
  var folderName = 'backup_' + now.toISOString().replace(/[:.]/g, '-') + '_' + identity.hostname;
  var targetDir = path.join(localBackupBase, folderName);
  fs.mkdirSync(targetDir, { recursive: true });

  // نسخ جميع ملفات البيانات
  var sourceDir = getDataDir();
  var files = fs.readdirSync(sourceDir);
  var copiedCount = 0;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (f.endsWith('.json') && !f.endsWith('.lock') && !f.endsWith('.tmp')) {
      var src = path.join(sourceDir, f);
      var dest = path.join(targetDir, f);
      try {
        var stat = fs.statSync(src);
        if (stat.isFile()) {
          fs.copyFileSync(src, dest);
          copiedCount++;
        }
      } catch (e) {}
    }
  }

  return {
    success: true,
    path: targetDir,
    folderName: folderName,
    filesCount: copiedCount,
    created_at: now.toISOString()
  };
}

/**
 * جلب إعدادات الشبكة الحالية
 */
function getNetworkConfig() {
  var candidates = [
    path.join(path.dirname(app.getPath('exe')), 'network-config.json'),
    path.join(app.getPath('userData'), 'network-config.json')
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) {
      try {
        var content = fs.readFileSync(candidates[i], 'utf8');
        var cfg = JSON.parse(content);
        return { found: true, config: cfg, path: candidates[i] };
      } catch (e) {}
    }
  }
  return { found: false, config: null, path: null };
}

/**
 * فصل الاتصال بالشبكة (حذف network-config.json)
 */
function disconnectNetwork() {
  var candidates = [
    path.join(path.dirname(app.getPath('exe')), 'network-config.json'),
    path.join(app.getPath('userData'), 'network-config.json')
  ];
  for (var i = 0; i < candidates.length; i++) {
    try {
      if (fs.existsSync(candidates[i])) {
        fs.unlinkSync(candidates[i]);
      }
    } catch (e) {}
  }
  networkConfig = null;
  dataDir = null;
  return { success: true };
}

// ============================================
// نظام إدارة المستخدمين (Multi-User System)
// ============================================

var crypto = require('crypto');

function getUsersFilePath() {
  return path.join(getDataDir(), 'users.json');
}

function readUsers() {
  var filePath = getUsersFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim() === '') return [];
    return JSON.parse(content);
  } catch (e) {
    console.error('[Users] Error reading users:', e.message);
    return [];
  }
}

function writeUsers(users) {
  ensureDataDir();
  var filePath = getUsersFilePath();
  var locked = false;
  try {
    if (isNetworkMode()) {
      locked = acquireLockSync(filePath);
    }
    // كتابة مباشرة أولاً (أكثر أماناً على مجلدات الشبكة)
    var jsonContent = JSON.stringify(users, null, 2);
    // نسخة احتياطية
    if (fs.existsSync(filePath)) {
      try { fs.copyFileSync(filePath, filePath + '.bak'); } catch (bakErr) {}
    }
    // محاولة الكتابة الذرية أولاً
    var tmpPath = filePath + '.tmp.' + process.pid;
    try {
      fs.writeFileSync(tmpPath, jsonContent, 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch (renameErr) {
      // في حالة فشل rename (مثل مجلدات الشبكة على Windows)، كتابة مباشرة
      console.warn('[Users] Atomic write failed, falling back to direct write:', renameErr.message);
      try { fs.unlinkSync(tmpPath); } catch (ue) {}
      fs.writeFileSync(filePath, jsonContent, 'utf8');
    }
    // التحقق من نجاح الكتابة
    if (fs.existsSync(filePath)) {
      var verify = fs.readFileSync(filePath, 'utf8');
      if (verify && verify.length > 2) {
        console.log('[Users] Successfully saved ' + users.length + ' users to:', filePath);
        return true;
      }
    }
    console.error('[Users] Verification failed after write');
    return false;
  } catch (e) {
    console.error('[Users] Error writing users:', e.message);
    try { fs.unlinkSync(filePath + '.tmp.' + process.pid); } catch (ue) {}
    return false;
  } finally {
    if (locked) releaseLockSync(filePath);
  }
}

function hashPasswordNode(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

function generateSaltNode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * الحصول على جميع المستخدمين (بدون كلمات المرور)
 */
function getAllUsers() {
  var users = readUsers();
  return users.map(function(u) {
    var copy = Object.assign({}, u);
    delete copy.password_hash;
    delete copy.salt;
    return copy;
  });
}

/**
 * التحقق من بيانات تسجيل الدخول
 */
function authenticateUser(username, password) {
  var users = readUsers();
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].is_active !== false) {
      user = users[i];
      break;
    }
  }
  if (!user) {
    return { success: false, error: 'اسم المستخدم غير موجود' };
  }
  if (user.failed_attempts >= 5) {
    var lockTime = user.locked_until ? new Date(user.locked_until).getTime() : 0;
    if (Date.now() < lockTime) {
      return { success: false, error: 'الحساب مقفل مؤقتاً. حاول بعد 5 دقائق.' };
    }
    // إعادة تعيين المحاولات بعد انتهاء القفل
    user.failed_attempts = 0;
    user.locked_until = null;
  }
  var hash = hashPasswordNode(password, user.salt);
  if (hash !== user.password_hash) {
    // تسجيل المحاولة الفاشلة
    user.failed_attempts = (user.failed_attempts || 0) + 1;
    if (user.failed_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }
    writeUsers(users);
    var remaining = 5 - user.failed_attempts;
    return { success: false, error: 'كلمة المرور غير صحيحة' + (remaining > 0 ? ' (متبقي ' + remaining + ' محاولات)' : '') };
  }
  // نجاح - إعادة تعيين المحاولات وتحديث آخر دخول
  user.failed_attempts = 0;
  user.locked_until = null;
  user.last_login = getCurrentDateTime();
  writeUsers(users);
  var safeUser = Object.assign({}, user);
  delete safeUser.password_hash;
  delete safeUser.salt;
  return { success: true, user: safeUser };
}

/**
 * إضافة مستخدم جديد
 */
function addUser(userData) {
  var users = readUsers();
  // التحقق من عدم تكرار اسم المستخدم
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === userData.username) {
      return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
    }
  }
  var salt = generateSaltNode();
  var newUser = {
    id: generateUUID(),
    username: userData.username,
    display_name: userData.display_name || userData.username,
    password_hash: hashPasswordNode(userData.password, salt),
    salt: salt,
    role: userData.role || 'employee',
    is_active: true,
    must_change_password: userData.must_change_password || false,
    failed_attempts: 0,
    locked_until: null,
    avatar_url: userData.avatar_url || null,
    custom_permissions: userData.custom_permissions || null,
    created_at: getCurrentDateTime(),
    last_login: getCurrentDateTime()
  };
  // حفظ سؤال وجواب الأمان (للمدير الأول فقط)
  if (userData.security_question && userData.security_answer) {
    var answerSalt = generateSaltNode();
    newUser.security_question = userData.security_question;
    newUser.security_answer_hash = hashPasswordNode(userData.security_answer.trim().toLowerCase(), answerSalt);
    newUser.security_answer_salt = answerSalt;
  }
  users.push(newUser);
  writeUsers(users);
  var safeUser = Object.assign({}, newUser);
  delete safeUser.password_hash;
  delete safeUser.salt;
  delete safeUser.security_answer_hash;
  delete safeUser.security_answer_salt;
  return { success: true, user: safeUser };
}

/**
 * تحديث مستخدم
 */
function updateUser(userId, updateData) {
  var users = readUsers();
  var idx = -1;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userId) { idx = i; break; }
  }
  if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
  
  if (updateData.username && updateData.username !== users[idx].username) {
    for (var j = 0; j < users.length; j++) {
      if (j !== idx && users[j].username === updateData.username) {
        return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
      }
    }
    users[idx].username = updateData.username;
  }
  if (updateData.display_name) users[idx].display_name = updateData.display_name;
  if (updateData.role) users[idx].role = updateData.role;
  if (typeof updateData.is_active === 'boolean') users[idx].is_active = updateData.is_active;
  if ('avatar_url' in updateData) users[idx].avatar_url = updateData.avatar_url || null;
  if ('custom_permissions' in updateData) users[idx].custom_permissions = updateData.custom_permissions || null;
  if (updateData.password) {
    var salt = generateSaltNode();
    users[idx].salt = salt;
    users[idx].password_hash = hashPasswordNode(updateData.password, salt);
    users[idx].must_change_password = false;
  }
  writeUsers(users);
  var safeUser = Object.assign({}, users[idx]);
  delete safeUser.password_hash;
  delete safeUser.salt;
  return { success: true, user: safeUser };
}

/**
 * حذف مستخدم
 */
function deleteUser(userId) {
  var users = readUsers();
  // لا يمكن حذف آخر مدير
  var admins = users.filter(function(u) { return u.role === 'admin' && u.id !== userId; });
  var target = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userId) { target = users[i]; break; }
  }
  if (target && target.role === 'admin' && admins.length === 0) {
    return { success: false, error: 'لا يمكن حذف آخر مدير في النظام' };
  }
  users = users.filter(function(u) { return u.id !== userId; });
  writeUsers(users);
  return { success: true };
}

/**
 * التحقق من وجود مستخدمين (لشاشة الإعداد الأولى)
 */
function hasUsers() {
  var users = readUsers();
  console.log('[Users] hasUsers check - found ' + users.length + ' users, path:', getUsersFilePath());
  return users.length > 0;
}

/**
 * تغيير كلمة المرور
 */
function changePassword(userId, oldPassword, newPassword) {
  var users = readUsers();
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userId) { user = users[i]; break; }
  }
  if (!user) return { success: false, error: 'المستخدم غير موجود' };
  var oldHash = hashPasswordNode(oldPassword, user.salt);
  if (oldHash !== user.password_hash) {
    return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
  }
  var newSalt = generateSaltNode();
  user.salt = newSalt;
  user.password_hash = hashPasswordNode(newPassword, newSalt);
  user.must_change_password = false;
  writeUsers(users);
  return { success: true };
}

/**
 * استعادة كلمة المرور عبر سؤال الأمان
 */
function recoverPasswordByQuestion(username, securityAnswer, newPassword) {
  var users = readUsers();
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) { user = users[i]; break; }
  }
  if (!user) return { success: false, error: 'اسم المستخدم غير موجود' };
  if (!user.security_question || !user.security_answer_hash) {
    return { success: false, error: 'لا يوجد سؤال أمان مسجل لهذا الحساب' };
  }
  var answerHash = hashPasswordNode(securityAnswer.trim().toLowerCase(), user.security_answer_salt);
  if (answerHash !== user.security_answer_hash) {
    return { success: false, error: 'إجابة سؤال الأمان غير صحيحة' };
  }
  var newSalt = generateSaltNode();
  user.salt = newSalt;
  user.password_hash = hashPasswordNode(newPassword, newSalt);
  user.failed_attempts = 0;
  user.locked_until = null;
  writeUsers(users);
  return { success: true };
}

/**
 * الحصول على سؤال الأمان لمستخدم
 */
function getSecurityQuestion(username) {
  var users = readUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      return { success: true, question: users[i].security_question || null };
    }
  }
  return { success: false, error: 'اسم المستخدم غير موجود' };
}

/**
 * إعادة تعيين كلمة المرور عبر ملف الطوارئ
 * يتحقق من وجود ملف reset.txt في مجلد البيانات
 */
function checkEmergencyReset() {
  try {
    var resetFilePath = path.join(getDataDir(), 'reset.txt');
    if (fs.existsSync(resetFilePath)) {
      var content = fs.readFileSync(resetFilePath, 'utf8').trim();
      // يجب أن يحتوي على الكلمة السرية: RESET_ADMIN_PASSWORD
      if (content === 'RESET_ADMIN_PASSWORD') {
        // إعادة تعيين كلمة مرور أول مدير إلى admin123
        var users = readUsers();
        var adminUser = null;
        for (var i = 0; i < users.length; i++) {
          if (users[i].role === 'admin') { adminUser = users[i]; break; }
        }
        if (adminUser) {
          var newSalt = generateSaltNode();
          adminUser.salt = newSalt;
          adminUser.password_hash = hashPasswordNode('admin123', newSalt);
          adminUser.failed_attempts = 0;
          adminUser.locked_until = null;
          adminUser.must_change_password = true;
          writeUsers(users);
          // حذف ملف الطوارئ بعد الاستخدام
          fs.unlinkSync(resetFilePath);
          return { success: true, username: adminUser.username, message: 'تم إعادة تعيين كلمة المرور إلى: admin123' };
        }
      }
      // حذف الملف حتى لو كان المحتوى خاطئ
      try { fs.unlinkSync(resetFilePath); } catch (e) {}
    }
  } catch (e) {
    console.error('[EmergencyReset] Error:', e.message);
  }
  return { success: false };
}

/**
 * الحصول على تنبيهات محاولات الدخول الفاشلة (الحسابات المقفولة أو ذات المحاولات الكثيرة)
 */
function getFailedLoginAlerts() {
  var users = readUsers();
  var alerts = [];
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if ((u.failed_attempts || 0) >= 3) {
      var isLocked = (u.failed_attempts >= 5) && u.locked_until && (new Date(u.locked_until).getTime() > Date.now());
      alerts.push({
        id: u.id,
        username: u.display_name || u.username,
        attempts: u.failed_attempts,
        locked: !!isLocked,
        last_attempt: u.locked_until || u.last_login || u.created_at
      });
    }
  }
  return { success: true, data: alerts };
}

/**
 * تجاهل تنبيه دخول فاشل (إعادة تعيين المحاولات)
 */
function dismissFailedLoginAlert(userIdOrUsername) {
  var users = readUsers();
  var found = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userIdOrUsername || users[i].username === userIdOrUsername) {
      users[i].failed_attempts = 0;
      users[i].locked_until = null;
      found = true;
      break;
    }
  }
  if (!found) return { success: false, error: 'المستخدم غير موجود' };
  writeUsers(users);
  return { success: true };
}

// ============================================
// تصدير الوحدة
// ============================================

module.exports = {
  isNetworkMode: isNetworkMode,
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
  saveLocalFile: saveLocalFile,
  
  // قفل السجلات
  acquireRecordLock: acquireRecordLock,
  releaseRecordLock: releaseRecordLock,
  checkRecordLock: checkRecordLock,
  
  // إدارة الذاكرة المؤقتة
  invalidateAllCache: invalidateAllCache,
  
  // إدارة الشبكة والأجهزة
  saveNetworkConfig: saveNetworkConfig,
  testNetworkPath: testNetworkPath,
  updateDeviceRegistry: updateDeviceRegistry,
  getDeviceRegistry: getDeviceRegistry,
  saveDeviceAliases: saveDeviceAliases,
  getDeviceAliases: getDeviceAliases,
  centralizedBackup: centralizedBackup,
  getNetworkConfig: getNetworkConfig,
  disconnectNetwork: disconnectNetwork,
  
  // إدارة المستخدمين
  getAllUsers: getAllUsers,
  authenticateUser: authenticateUser,
  addUser: addUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  hasUsers: hasUsers,
  changePassword: changePassword,
  recoverPasswordByQuestion: recoverPasswordByQuestion,
  getSecurityQuestion: getSecurityQuestion,
  checkEmergencyReset: checkEmergencyReset,
  getFailedLoginAlerts: getFailedLoginAlerts,
  dismissFailedLoginAlert: dismissFailedLoginAlert
};
