// Preload script for Electron
// This runs in the renderer process before the page loads
// Can be used to expose specific Node.js functionality to the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
});
