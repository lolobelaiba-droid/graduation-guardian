const { app, BrowserWindow, Menu, MenuItem, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// تسريع العتاد مفعّل لضمان جودة معاينة الطباعة (يتطلب Windows 10/11)
// app.disableHardwareAcceleration();
const { pathToFileURL } = require('url');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup not available
}

// Database imports - استخدام JSON Store بدلاً من SQLite
const db = require('./database/json-store.cjs');
const { registerDatabaseHandlers } = require('./database/ipc-handlers.cjs');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // RTL-friendly title bar
    titleBarStyle: 'default',
    show: false,
  });

  // Create a simple menu
  const template = [
    {
      label: 'ملف',
      submenu: [
        { label: 'إعادة تحميل', role: 'reload' },
        { label: 'أدوات المطور', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'خروج', role: 'quit' }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', role: 'undo' },
        { label: 'إعادة', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', role: 'cut' },
        { label: 'نسخ', role: 'copy' },
        { label: 'لصق', role: 'paste' },
        { label: 'تحديد الكل', role: 'selectAll' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', role: 'zoomIn' },
        { label: 'تصغير', role: 'zoomOut' },
        { label: 'حجم افتراضي', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'قاعدة البيانات',
      submenu: [
        { 
          label: 'فتح مجلد البيانات', 
          click: () => {
            const dbPath = db.getDatabasePath();
            shell.openPath(dbPath);
          }
        },
        { 
          label: 'نسخ البيانات احتياطياً', 
          click: async () => {
            const dbPath = db.getDatabasePath();
            const backupPath = path.join(
              app.getPath('documents'),
              `certificates_backup_${new Date().toISOString().split('T')[0]}`
            );
            
            // نسخ مجلد البيانات بالكامل
            if (fs.existsSync(dbPath)) {
              fs.cpSync(dbPath, backupPath, { recursive: true });
              shell.openPath(backupPath);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Determine if we're in development or production
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, load from the Vite dev server
    // Try port 8080 first (Lovable default), then 5173 (Vite default)
    mainWindow.loadURL('http://localhost:8080').catch(() => {
      mainWindow.loadURL('http://localhost:5173');
    });
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files using file:// protocol
    // The base path in vite.config.ts is set to "./" for relative paths
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // إضافة قائمة سياقية (نقر يمين) لحقول الإدخال
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = new Menu();

    if (params.isEditable || params.selectionText) {
      if (params.isEditable) {
        contextMenu.append(new MenuItem({ label: 'تراجع', role: 'undo', enabled: params.editFlags.canUndo }));
        contextMenu.append(new MenuItem({ label: 'إعادة', role: 'redo', enabled: params.editFlags.canRedo }));
        contextMenu.append(new MenuItem({ type: 'separator' }));
      }
      if (params.selectionText) {
        contextMenu.append(new MenuItem({ label: 'قص', role: 'cut', enabled: params.editFlags.canCut }));
        contextMenu.append(new MenuItem({ label: 'نسخ', role: 'copy', enabled: params.editFlags.canCopy }));
      }
      if (params.isEditable) {
        contextMenu.append(new MenuItem({ label: 'لصق', role: 'paste', enabled: params.editFlags.canPaste }));
      }
      if (params.selectionText) {
        contextMenu.append(new MenuItem({ type: 'separator' }));
        contextMenu.append(new MenuItem({ label: 'تحديد الكل', role: 'selectAll', enabled: params.editFlags.canSelectAll }));
      }
      contextMenu.popup();
    }
  });

  // مهلة أمان: إظهار النافذة بعد 5 ثوانٍ حتى لو لم يكتمل التحميل
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('[Main] Window not visible after 5s, forcing show');
      mainWindow.show();
    }
  }, 5000);

  // معالجة أخطاء تحميل الصفحة
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Page failed to load:', errorCode, errorDescription);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  // Handle window close with confirmation
  let forceClose = false;
  mainWindow.on('close', (e) => {
    if (!forceClose) {
      e.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['إغلاق', 'إلغاء'],
        defaultId: 1,
        cancelId: 1,
        title: 'تأكيد الإغلاق',
        message: 'هل أنت متأكد من إغلاق التطبيق؟',
        detail: 'تأكد من حفظ نسخة احتياطية من بياناتك قبل الإغلاق.',
      }).then((result) => {
        if (result.response === 0) {
          forceClose = true;
          // استخدام destroy() بدلاً من close() لتجنب التعارض مع beforeunload
          mainWindow.destroy();
        }
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =====================
// Printer / Print IPC
// =====================

// =====================
// File Save IPC (for backup)
// =====================

function registerFileHandlers() {
  ipcMain.handle('file:saveDialog', async (_event, payload) => {
    try {
      const { defaultFileName, content } = payload || {};
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'حفظ النسخة الاحتياطية',
        defaultPath: path.join(app.getPath('documents'), defaultFileName || 'backup.json'),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' };
      }

      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (e) {
      console.error('Failed to save file:', e);
      return { success: false, error: String(e?.message || e) };
    }
  });

  console.log('File IPC handlers registered');
}

function registerPrinterHandlers() {
  ipcMain.handle('printers:list', async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return [];
    try {
      const printers = await win.webContents.getPrintersAsync();
      return printers;
    } catch (e) {
      console.error('Failed to list printers:', e);
      return [];
    }
  });

  ipcMain.handle('printers:open-settings', async () => {
    try {
      if (process.platform === 'win32') {
        await shell.openExternal('ms-settings:printers');
        return true;
      }
      if (process.platform === 'darwin') {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.printers');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to open printer settings:', e);
      return false;
    }
  });

  ipcMain.handle('printers:print-pdf', async (_event, payload) => {
    try {
      const { pdf, options } = payload || {};
      if (!pdf) return { success: false, error: 'Missing PDF data' };

      const deviceName = options?.deviceName;

      const tmpPath = path.join(os.tmpdir(), `certificates_${Date.now()}.pdf`);
      const buffer = Buffer.from(new Uint8Array(pdf));
      fs.writeFileSync(tmpPath, buffer);

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
        },
      });

      await printWindow.loadURL(pathToFileURL(tmpPath).toString());

      await new Promise((r) => setTimeout(r, 300));

      const success = await new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: deviceName || undefined,
          },
          (ok, failureReason) => {
            if (!ok) console.error('Print failed:', failureReason);
            resolve(ok);
          }
        );
      });

      try {
        printWindow.close();
      } catch {
        // ignore
      }

      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }

      return success ? { success: true } : { success: false, error: 'Print cancelled or failed' };
    } catch (e) {
      console.error('Failed to print PDF:', e);
      return { success: false, error: String(e?.message || e) };
    }
  });

  ipcMain.handle('printers:print-native', async (_event, payload) => {
    try {
      const { options } = payload || {};
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (!win) return { success: false, error: 'No window available' };

      const success = await new Promise((resolve) => {
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: options?.pageSize || undefined,
            landscape: options?.landscape || false,
          },
          (ok, failureReason) => {
            if (!ok) console.error('Print failed:', failureReason);
            resolve(ok);
          }
        );
      });

      return success ? { success: true } : { success: false, error: 'Print cancelled or failed' };
    } catch (e) {
      console.error('Failed to print:', e);
      return { success: false, error: String(e?.message || e) };
    }
  });
  // حفظ الصفحة كملف PDF
  ipcMain.handle('printers:print-to-pdf', async (_event, payload) => {
    try {
      const { options } = payload || {};
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (!win) return { success: false, error: 'No window available' };

      const result = await dialog.showSaveDialog(win, {
        title: 'حفظ كملف PDF',
        defaultPath: path.join(app.getPath('documents'), options?.defaultFileName || 'document.pdf'),
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' };
      }

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: options?.pageSize || undefined,
        landscape: options?.landscape || false,
      });

      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, filePath: result.filePath };
    } catch (e) {
      console.error('Failed to print to PDF:', e);
      return { success: false, error: String(e?.message || e) };
    }
  });

  console.log('Printer IPC handlers registered');
}

// =====================
// Defense Document Print via Hidden Window
// =====================
function registerDefenseDocHandlers() {
  ipcMain.handle('printers:print-doc-html', async (_event, payload) => {
    try {
      const { html, action, defaultFileName, options } = payload || {};
      if (!html) return { success: false, error: 'Missing HTML content' };

      // Write HTML to temp file next to the app's dist for font access
      const appRoot = app.isPackaged
        ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app')
        : path.join(__dirname, '..');
      const fontsDir = path.join(appRoot, 'dist', 'fonts');
      // Fallback: if dist/fonts doesn't exist, use public/fonts
      const actualFontsDir = fs.existsSync(fontsDir)
        ? fontsDir
        : path.join(appRoot, 'public', 'fonts');

      // Build font-face declarations with absolute file:// URLs
      const fontFiles = fs.existsSync(actualFontsDir)
        ? fs.readdirSync(actualFontsDir).filter(f => f.endsWith('.ttf'))
        : [];

      let fontFaces = '';
      const fontMap = {
        'IBMPlexSansArabic-Light.ttf': { family: 'IBM Plex Sans Arabic', weight: 300 },
        'IBMPlexSansArabic-Regular.ttf': { family: 'IBM Plex Sans Arabic', weight: 400 },
        'IBMPlexSansArabic-Medium.ttf': { family: 'IBM Plex Sans Arabic', weight: 500 },
        'IBMPlexSansArabic-SemiBold.ttf': { family: 'IBM Plex Sans Arabic', weight: 600 },
        'IBMPlexSansArabic-Bold.ttf': { family: 'IBM Plex Sans Arabic', weight: 700 },
        'Amiri-Regular.ttf': { family: 'Amiri', weight: 400 },
        'Amiri-Bold.ttf': { family: 'Amiri', weight: 700 },
        'Cairo-Regular.ttf': { family: 'Cairo', weight: 400 },
        'NotoSansArabic-Regular.ttf': { family: 'Noto Sans Arabic', weight: 400 },
        'Tajawal-Regular.ttf': { family: 'Tajawal', weight: 400 },
        'Tajawal-Bold.ttf': { family: 'Tajawal', weight: 700 },
      };

      fontFiles.forEach(f => {
        const info = fontMap[f];
        if (info) {
          const fontUrl = pathToFileURL(path.join(actualFontsDir, f)).href;
          fontFaces += `
@font-face {
  font-family: '${info.family}';
  src: url('${fontUrl}') format('truetype');
  font-weight: ${info.weight};
  font-style: normal;
}`;
        }
      });

      // Also check for custom fonts stored in the data folder
      const customFontsDir = path.join(db.getDatabasePath(), 'fonts');
      if (fs.existsSync(customFontsDir)) {
        const customFontFiles = fs.readdirSync(customFontsDir).filter(f => f.endsWith('.ttf') || f.endsWith('.otf') || f.endsWith('.woff') || f.endsWith('.woff2'));
        customFontFiles.forEach(f => {
          const fontUrl = pathToFileURL(path.join(customFontsDir, f)).href;
          const baseName = path.parse(f).name;
          fontFaces += `
@font-face {
  font-family: '${baseName}';
  src: url('${fontUrl}');
  font-weight: 400;
  font-style: normal;
}`;
        });
      }

      const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
${fontFaces}
* { margin: 0; padding: 0; box-sizing: border-box; }
@page {
  size: A4 portrait;
  margin: 0;
}
body {
  margin: 0;
  padding: 0;
  background: white;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>
</head>
<body>
${html}
</body>
</html>`;

      const tmpPath = path.join(os.tmpdir(), `defense_doc_${Date.now()}.html`);
      fs.writeFileSync(tmpPath, fullHtml, 'utf8');

      const printWin = new BrowserWindow({
        show: false,
        width: 794,
        height: 1123,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // Allow file:// font loading
        },
      });

      await printWin.loadFile(tmpPath);

      // Wait for fonts to load
      try {
        await printWin.webContents.executeJavaScript('document.fonts.ready.then(() => true)', true);
      } catch (e) {
        console.warn('Font ready check failed, proceeding:', e);
      }
      // Extra settle time for layout
      await new Promise(r => setTimeout(r, 600));

      let result;
      if (action === 'pdf') {
        const saveResult = await dialog.showSaveDialog(mainWindow || printWin, {
          title: 'حفظ كملف PDF',
          defaultPath: path.join(app.getPath('documents'), defaultFileName || 'document.pdf'),
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          result = { success: false, error: 'cancelled' };
        } else {
          const pdfData = await printWin.webContents.printToPDF({
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: 'A4',
            landscape: false,
          });
          fs.writeFileSync(saveResult.filePath, pdfData);
          result = { success: true, filePath: saveResult.filePath };
        }
      } else {
        // Native print
        const printSuccess = await new Promise((resolve) => {
          printWin.webContents.print(
            {
              silent: false,
              printBackground: true,
              margins: { marginType: 'none' },
              pageSize: 'A4',
              landscape: false,
            },
            (ok, failureReason) => {
              if (!ok) console.error('Defense doc print failed:', failureReason);
              resolve(ok);
            }
          );
        });
        result = printSuccess
          ? { success: true }
          : { success: false, error: 'Print cancelled or failed' };
      }

      try { printWin.close(); } catch {}
      try { fs.unlinkSync(tmpPath); } catch {}

      return result;
    } catch (e) {
      console.error('Failed to print defense document:', e);
      return { success: false, error: String(e?.message || e) };
    }
  });

  console.log('Defense document IPC handlers registered');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize database
  db.initializeDatabase();
  
  // Register all IPC handlers
  const dbHandlers = registerDatabaseHandlers();
  registerFileHandlers();
  registerPrinterHandlers();
  registerDefenseDocHandlers();
  
  createWindow();

  // بدء مراقبة الشبكة بعد إنشاء النافذة
  if (mainWindow && dbHandlers && dbHandlers.startNetworkMonitor) {
    dbHandlers.startNetworkMonitor(mainWindow);
  }

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // Close database connection
  db.closeDatabase();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app before quit
app.on('before-quit', () => {
  db.closeDatabase();
});

// Handle any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
