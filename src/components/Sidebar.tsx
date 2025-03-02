import React from 'react';
import { useFiles } from '../contexts/FileContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './Sidebar.css';

dayjs.extend(relativeTime);

const Sidebar: React.FC = () => {
  const { currentFile, recentFiles, createNewNote, openNote, saveNote } = useFiles();

  const onNewNote = () => {
    createNewNote();
  };

  const onFileSelect = async (filePath?: string) => {
    if (filePath) {
      await openNote(filePath);
    }
  };

  return (
    <div className="sidebar">
      <h3>Recent Notes</h3>
      <button onClick={onNewNote}>New Note</button>
      <div className="recent-notes-list">
        {Array.from(recentFiles.values())
          .sort((a, b) => (b.modified > a.modified ? 1 : -1))
          .map((file, index) => {
            const active = currentFile.id === file.id ? 'active' : '';
            return (
              <React.Fragment key={file.name}>
                <div className={`note-tab ${active}`} onClick={() => onFileSelect(file.filePath)}>
                  <div className={`note-title ${active}`}>{file.title}</div>
                  <div className="note-subheader">{dayjs(file.modified).fromNow()}</div>
                </div>
                {index < recentFiles.size - 1 && <div className="note-divider" />}
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
};

export default Sidebar;
