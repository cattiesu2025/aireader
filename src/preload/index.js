import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  hashFile: (filePath) => ipcRenderer.invoke('hash-file', filePath),
})
