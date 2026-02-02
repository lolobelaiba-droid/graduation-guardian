# Building Desktop Application (Offline with JSON Storage)

This guide explains how to build and run the application as a standalone desktop app with local JSON-based storage.

## Prerequisites

Before building the desktop application, make sure you have:
- Node.js 18+ installed
- Git installed
- npm, yarn, or bun package manager

## Quick Start (Development Mode)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

### 2. Run in Development Mode

```bash
npm run electron:dev
```

This will:
1. Start the Vite development server
2. Launch Electron window pointing to the dev server
3. Open DevTools for debugging

## Building for Production

### Windows

```bash
# Build frontend
npm run build

# Build Electron app
npm run electron:build
```

Output in `release/` folder:
- **Portable**: `نظام الشهادات الجامعية-Portable-x.x.x.exe`
  - No installation required
  - Can run directly from USB drive
  
- **Installer**: `نظام الشهادات الجامعية-x.x.x-x64.exe`
  - Full installer with Start Menu shortcuts
  - Recommended for permanent installation

### macOS

```bash
npm run build
npm run electron:build
```

Output:
- **DMG**: Standard macOS installer
- **ZIP**: Portable version

### Linux

```bash
npm run build
npm run electron:build
```

Output:
- **AppImage**: Portable Linux application
- **DEB**: Debian/Ubuntu installer

## Configuration Files

| File | Purpose |
|------|---------|
| `electron/main.js` | Electron main process |
| `electron/preload.js` | Preload script (IPC bridge) |
| `electron/database/json-store.js` | JSON-based data storage |
| `electron/database/ipc-handlers.js` | IPC handlers for database |
| `electron-builder.json` | Build configuration |

## Data Location

Data is stored as JSON files in the user's application data folder:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\نظام الشهادات الجامعية\data\` |
| macOS | `~/Library/Application Support/نظام الشهادات الجامعية/data/` |
| Linux | `~/.config/نظام الشهادات الجامعية/data/` |

### Data Files

- `phd_lmd_certificates.json` - شهادات دكتوراه ل م د
- `phd_science_certificates.json` - شهادات دكتوراه علوم
- `master_certificates.json` - شهادات الماستر
- `certificate_templates.json` - قوالب الشهادات
- `certificate_template_fields.json` - حقول القوالب
- `settings.json` - الإعدادات
- `user_settings.json` - إعدادات المستخدم
- `dropdown_options.json` - خيارات القوائم
- `custom_fonts.json` - الخطوط المخصصة
- `activity_log.json` - سجل النشاطات

### Backup Data

From the application menu: **قاعدة البيانات** > **نسخ البيانات احتياطياً**

Or manually copy the `data` folder.

## Offline Functionality

The desktop version works **completely offline**:

✅ All data stored locally as JSON files  
✅ No internet connection required  
✅ No native compilation needed (no node-gyp)  
✅ PDF generation works offline  
✅ Printing to local printers  
✅ Backup/restore via JSON files  

## Migrating from Web to Desktop

1. In web version: Go to Settings > Backup > Download Backup
2. Install and run the desktop version
3. Go to Settings > Backup > Restore from Backup
4. Select the JSON backup file
5. All your data is now in the local storage

## Troubleshooting

### App doesn't start

1. Delete the data folder (see Data Location above)
2. Restart the app (new empty data files will be created)

### Blank screen in production

Make sure to run `npm run build` before `npm run electron:build`

### Fonts not loading

Ensure the `public/fonts` folder contains the required Arabic fonts:
- IBMPlexSansArabic-Light.ttf
- IBMPlexSansArabic-Regular.ttf
- IBMPlexSansArabic-Medium.ttf
- IBMPlexSansArabic-SemiBold.ttf
- IBMPlexSansArabic-Bold.ttf

## Development Notes

### How the storage system works

The application uses JSON files for data storage instead of SQLite:
- No native modules required
- No compilation dependencies (node-gyp, Python, Visual Studio)
- Simple to backup and restore
- Cross-platform compatible

### Architecture

```
React App (Renderer Process)
        ↓
   IPC Bridge (preload.js)
        ↓
  JSON Store (main process)
        ↓
   File System (JSON files)
```

### Adding new database operations

1. Add the operation in `electron/database/json-store.js`
2. Add IPC handler in `electron/database/ipc-handlers.js`
3. Expose in `electron/preload.js`
4. Add TypeScript types in `src/types/electron-api.d.ts`
5. Use in service layer `src/lib/database/`

## Security Notes

- The desktop app runs with Node.js integration disabled
- All data access is through IPC (context isolation)
- No external network calls for core functionality
- Sensitive data stays on the user's machine

## Build Requirements

Unlike SQLite-based solutions, this build requires:
- ✅ Node.js only
- ❌ No Python required
- ❌ No Visual Studio Build Tools required
- ❌ No node-gyp compilation

This makes the build process much simpler and more reliable across different systems.
