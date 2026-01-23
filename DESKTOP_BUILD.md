# Building Desktop Application

## Prerequisites

Before building the desktop application, make sure you have:
- Node.js 18+ installed
- Git installed

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <project-folder>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run electron:dev
   ```

4. **Build for production:**
   ```bash
   npm run electron:build
   ```

## Build Outputs

After running `npm run electron:build`, you'll find the following in the `release` folder:

### Windows
- **Portable Version**: `نظام الشهادات الجامعية-Portable-x.x.x.exe`
  - No installation required
  - Just run the .exe file directly
  - Can be copied to USB drive

- **Installer Version**: `نظام الشهادات الجامعية-x.x.x-x64.exe`
  - Full installer with start menu shortcuts
  - Recommended for permanent installation

### macOS
- **DMG**: Standard macOS installer
- **ZIP**: Portable version for macOS

### Linux
- **AppImage**: Portable Linux application
- **DEB**: Debian/Ubuntu installer

## Configuration

The Electron configuration is in:
- `electron/main.js` - Main process
- `electron/preload.js` - Preload script
- `electron-builder.json` - Build configuration

## Notes

- The portable version doesn't require installation
- All data is stored locally in the app's data directory
- The app connects to the cloud database (Supabase) for data storage
