import React, { useState, useRef, useEffect } from 'react';
import { useFiles } from '../contexts/FileContext';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const { recentFiles } = useFiles();
  const [query, setQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value.toLowerCase());
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 0);
    }
  };

  const searchResults = Array.from(recentFiles.values()).filter((note) =>
    note.content.toLowerCase().includes(query)
  );

  return (
    <div className="search-container" ref={searchRef}>
      <div className={`search-bar ${isSearchActive ? 'active' : ''}`}>
        <input
          type="text"
          placeholder="Search notes..."
          value={query}
          onChange={handleSearch}
          onBlur={() => setIsSearchActive(false)}
          className="search-input"
        />
        <button className="search-icon" onClick={toggleSearch} aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>
      </div>
      {isSearchActive && query && (
        <div className="search-results">
          {searchResults.map((note) => (
            <div key={note.filePath} className="search-result-item">
              {note.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
