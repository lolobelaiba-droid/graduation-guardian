# Building Desktop Application (Offline with SQLite)

This guide explains how to build and run the application as a standalone desktop app with local SQLite database.

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

### 2. Install SQLite Dependencies

```bash
# Install better-sqlite3 for local database
npm install better-sqlite3 --save

# Rebuild native modules for Electron
npm install electron-rebuild --save-dev
npx electron-rebuild
```

### 3. Run in Development Mode

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
| `electron/database/schema.sql` | SQLite database schema |
| `electron/database/database.js` | Database operations |
| `electron/database/ipc-handlers.js` | IPC handlers for database |
| `electron-builder.json` | Build configuration |

## Database Location

The SQLite database is stored in the user's application data folder:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\نظام الشهادات الجامعية\certificates.db` |
| macOS | `~/Library/Application Support/نظام الشهادات الجامعية/certificates.db` |
| Linux | `~/.config/نظام الشهادات الجامعية/certificates.db` |

### Backup Database

From the application menu: **قاعدة البيانات** > **نسخ قاعدة البيانات احتياطياً**

Or manually copy the `certificates.db` file.

## Offline Functionality

The desktop version works **completely offline**:

✅ All data stored locally in SQLite  
✅ No internet connection required  
✅ PDF generation works offline  
✅ Printing to local printers  
✅ Backup/restore via JSON files  

## Migrating from Web to Desktop

1. In web version: Go to Settings > Backup > Download Backup
2. Install and run the desktop version
3. Go to Settings > Backup > Restore from Backup
4. Select the JSON backup file
5. All your data is now in the local database

## Troubleshooting

### "Cannot find module 'better-sqlite3'" error

Run:
```bash
npx electron-rebuild
```

### App crashes on startup

1. Delete the database file (see Database Location above)
2. Restart the app (a new empty database will be created)

### Native module build errors on Windows

Install Visual Studio Build Tools:
```bash
npm install --global windows-build-tools
```

### Blank screen in production

Make sure to run `npm run build` before `npm run electron:build`

## Development Notes

### How the dual-database system works

The application automatically detects the environment:

```typescript
import { isElectron } from "@/lib/database";

if (isElectron()) {
  // Use SQLite via IPC
} else {
  // Use Supabase
}
```

### Adding new database operations

1. Add the SQL operation in `electron/database/database.js`
2. Add IPC handler in `electron/database/ipc-handlers.js`
3. Expose in `electron/preload.js`
4. Add TypeScript types in `src/types/electron-api.d.ts`
5. Use in service layer `src/lib/database/`

## Security Notes

- The desktop app runs with Node.js integration disabled
- All database access is through IPC (context isolation)
- No external network calls for core functionality
- Sensitive data stays on the user's machine
