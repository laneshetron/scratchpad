import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadRecentFiles: () => ipcRenderer.invoke('load-recent-files'),
  openFile: (filePath: string) => ipcRenderer.invoke('file-open', filePath),
  saveFile: (content: string, name: string, filePath: string | null) =>
    ipcRenderer.invoke('file-save', { content, name, filePath }),
  openFileDialog: () => ipcRenderer.invoke('file-open-dialog'),
  onContentChanged: (content: string, filePath: string | null) =>
    ipcRenderer.send('content-changed', { content, filePath }),
  handleFileOperations: (callback: () => void) => {
    ipcRenderer.on('file-open-dialog', callback);
    return () => ipcRenderer.removeListener('file-open-dialog', callback);
  },
});
