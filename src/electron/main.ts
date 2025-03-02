import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import * as path from 'path';
import * as fs from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let NOTES_DIR: string;
const isMac = process.platform === 'darwin';

// Initialize app
app.whenReady().then(async () => {
  await initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Initialize directories and files
async function initializeApp() {
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.StaticStorage,
      baseUrl: `https://scratchpad-releases.s3.us-east-1.amazonaws.com/scratchpad/${process.platform}/${process.arch}`,
    },
  });

  NOTES_DIR = path.join(app.getPath('userData'), 'notes');

  try {
    await fs.mkdir(NOTES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: app.isPackaged ? 800 : 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    //titleBarStyle: 'hidden', // Add this for macOS
  });

  createApplicationMenu();

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer/index.html')
    : path.join(__dirname, '../renderer/index.html');

  mainWindow.loadFile(indexPath);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// File management functions
async function loadRecentFiles(): Promise<{ filePath: string; mtime: Date }[]> {
  try {
    const files = await fs.readdir(NOTES_DIR);
    // Filter for JSON files and get full paths
    const jsonFiles = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(NOTES_DIR, file));
    // Sort by modification time (most recent first)
    const sortedFiles = await Promise.all(
      jsonFiles.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        return { filePath, mtime: stats.mtime };
      })
    );
    sortedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    //return sortedFiles.slice(0, MAX_RECENT_FILES);
    return sortedFiles;
  } catch (error) {
    console.error('Error loading files from directory:', error);
    return [];
  }
}

async function updateRecentFiles(filePath: string) {
  try {
    const recentFiles = await loadRecentFiles();
    return recentFiles;
  } catch (error) {
    console.error('Error updating recent files:', error);
    return [];
  }
}

// IPC Handlers
ipcMain.handle('load-recent-files', async () => {
  return await loadRecentFiles();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('file-open', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    await updateRecentFiles(filePath);
    return content;
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
});

ipcMain.handle(
  'file-save',
  async (
    _,
    { content, name, filePath }: { content: string; name: string; filePath: string | null }
  ) => {
    try {
      const finalPath = filePath || path.join(NOTES_DIR, `${name}.json`);
      await fs.writeFile(finalPath, content, 'utf-8');
      const updatedFiles = await updateRecentFiles(finalPath);
      return { filePath: finalPath, recentFiles: updatedFiles };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }
);

ipcMain.handle('file-open-dialog', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'HTML Files', extensions: ['html'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      await updateRecentFiles(filePath);
      return { content, filePath };
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }
  return null;
});

// Auto-save functionality
let autoSaveTimer: NodeJS.Timeout | null = null;

ipcMain.on(
  'content-changed',
  async (_, { content, filePath }: { content: string; filePath: string | null }) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(async () => {
      try {
        console.log('Autosaving...');
        await ipcMain.emit('file-save', { content, filePath });
      } catch (error) {
        console.error('Error auto-saving:', error);
      }
    }, 2000); // Auto-save after 2 seconds of no changes
  }
);

// Export path helper for preload script
export const getUserDataPath = () => app.getPath('userData');

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('file-open-dialog');
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('file-save');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
