import React, { createContext, useContext, useState, useEffect } from 'react';
import { NoteTab } from '../types';

interface FileContextType {
  currentFile: NoteTab;
  recentFiles: Map<string, NoteTab>;
  saveNote: (content: string, fileName: string, filePath?: string) => Promise<void>;
  openNote: (filePath: string) => Promise<void>;
  createNewNote: () => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

// Helper function to create a NoteTab object
const createNoteTab = (filePath: string, content: string, modified?: Date): NoteTab => {
  const parsed = content ? JSON.parse(content) : {};
  const fileName =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.json$/, '') || 'Untitled';

  return {
    id: fileName,
    title: parsed.root?.children[0]?.children[0]?.text || 'Untitled',
    name: fileName,
    filePath,
    content,
    modified: modified || new Date(),
  };
};

const createEmptyNoteTab = (): NoteTab => {
  const name = new Date().toISOString();
  return {
    id: name,
    title: 'Untitled',
    name: name,
    filePath: undefined,
    content: '',
    modified: new Date(),
  };
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentFile, setCurrentFile] = useState<NoteTab>(createEmptyNoteTab());
  const [recentFiles, setRecentFiles] = useState<Map<string, NoteTab>>(new Map());

  useEffect(() => {
    const loadInitialFiles = async () => {
      try {
        const paths = await window.electronAPI.loadRecentFiles();
        const fileContents = await Promise.all(
          paths.map((path) => window.electronAPI.openFile(path.filePath))
        );
        const newRecentFiles = new Map<string, NoteTab>(
          paths.map((path, index) => {
            const noteTab = createNoteTab(path.filePath, fileContents[index], path.mtime);
            return [noteTab.name, noteTab];
          })
        );
        setRecentFiles(newRecentFiles);

        // set editor to most recent note
        if (newRecentFiles.size > 0) {
          setCurrentFile(newRecentFiles.values().next().value);
        }
      } catch (error) {
        console.error('Failed to load recent files:', error);
      }
    };

    loadInitialFiles();
  }, []);

  useEffect(() => {
    const handleFileOperations = () => {
      const openCallback = async () => {
        const result = await window.electronAPI.openFileDialog();
        if (result) {
          setCurrentFile(createNoteTab(result.filePath, result.content));
        }
      };

      window.electronAPI.handleFileOperations(openCallback);

      return () => {
        // Cleanup if necessary
      };
    };

    const cleanup = handleFileOperations();
    return () => cleanup();
  }, [currentFile]);

  const saveNote = async (content: string, fileName: string, filePath?: string) => {
    try {
      const result = await window.electronAPI.saveFile(content, fileName, filePath || null);
      const noteTab = createNoteTab(result.filePath, content);
      setCurrentFile(noteTab);
      recentFiles.set(noteTab.name, noteTab);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const openNote = async (filePath: string) => {
    try {
      const content = await window.electronAPI.openFile(filePath);
      setCurrentFile(createNoteTab(filePath, content));
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  };

  const createNewNote = () => {
    const newNote = createEmptyNoteTab();
    setCurrentFile(newNote);
    recentFiles.set(newNote.name, newNote);
  };

  return (
    <FileContext.Provider
      value={{
        currentFile,
        recentFiles,
        saveNote,
        openNote,
        createNewNote,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFiles must be used within FileProvider');
  return context;
};
