const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
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
const db = require('./database/json-store');
const { registerDatabaseHandlers } = require('./database/ipc-handlers');

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
      preload: path.join(__dirname, 'preload.js'),
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
    // Linux: no universal URI. Return false so the UI can inform the user.
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

    // Write to a temporary file so Chromium PDF viewer can load it reliably.
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

    // Wait a tick for the PDF plugin/viewer to initialize.
    await new Promise((r) => setTimeout(r, 300));

    const success = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: false, // show native dialog (tools/properties)
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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize database
  db.initializeDatabase();
  
  // Register database IPC handlers
  registerDatabaseHandlers();
  
  createWindow();

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
