import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App status
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),

  // Window control
  showWindow: () => ipcRenderer.invoke('show-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),

  // Gateway control
  startGateway: () => ipcRenderer.invoke('gateway:start'),
  stopGateway: () => ipcRenderer.invoke('gateway:stop'),
  restartGateway: () => ipcRenderer.invoke('gateway:restart'),
  getGatewayStatus: () => ipcRenderer.invoke('gateway:status'),
  getGatewayHealth: () => ipcRenderer.invoke('gateway:health'),

  // Update control
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),

  // Events
  onGatewayStatus: (callback: (status: unknown) => void) => {
    ipcRenderer.on('gateway:status', (_event, status) => callback(status))
  },
  onUpdateStatus: (callback: (status: unknown) => void) => {
    ipcRenderer.on('update:status', (_event, status) => callback(status))
  },
  onLog: (callback: (log: unknown) => void) => {
    ipcRenderer.on('log', (_event, log) => callback(log))
  }
})
