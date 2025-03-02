import React from 'react';
import { Editor } from './components/Editor';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import { FileProvider } from './contexts/FileContext';
import './App.css';

declare global {
  interface Window {
    electronAPI: {
      loadRecentFiles: () => Promise<{ filePath: string; mtime: Date }[]>;
      openFile: (path: string) => Promise<string>;
      saveFile: (
        content: string,
        name: string,
        path: string | null
      ) => Promise<{ filePath: string; recentFiles: { filePath: string; mtime: Date }[] }>;
      openFileDialog: () => Promise<{ content: string; filePath: string } | null>;
      onContentChanged: (content: string, filePath: string | null) => void;
      handleFileOperations: (callback: () => void) => void;
    };
  }
}

const App: React.FC = () => {
  window.electronAPI.handleFileOperations(() => {
    window.electronAPI.openFileDialog();
  });

  return (
    <div className="app">
      <FileProvider>
        <Sidebar />
        <div className="divider" />
        <div className="main-content">
          <SearchBar />
          <Editor />
        </div>
      </FileProvider>
    </div>
  );
};

export default App;
