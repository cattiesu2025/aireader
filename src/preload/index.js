import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  hashFile: (filePath) => ipcRenderer.invoke('hash-file', filePath),
  saveTempImage: (base64) => ipcRenderer.invoke('save-temp-image', base64),
  deleteTempImage: (filePath) => ipcRenderer.invoke('delete-temp-image', filePath),
})
