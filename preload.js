const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron
});