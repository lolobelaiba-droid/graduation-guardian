import { useState, useCallback, useEffect } from "react";

const HISTORY_KEY = "data-explorer-search-history";
const BOOKMARKS_KEY = "data-explorer-bookmarks";
const MAX_HISTORY = 15;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
}

export interface BookmarkItem {
  id: string;
  query: string;
  label: string;
  createdAt: number;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => loadFromStorage(HISTORY_KEY, []));
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadFromStorage(BOOKMARKS_KEY, []));

  useEffect(() => { saveToStorage(HISTORY_KEY, history); }, [history]);
  useEffect(() => { saveToStorage(BOOKMARKS_KEY, bookmarks); }, [bookmarks]);

  const addToHistory = useCallback((query: string, resultCount?: number) => {
    if (!query || query.trim().length < 2) return;
    setHistory(prev => {
      const filtered = prev.filter(h => h.query !== query);
      return [{ query, timestamp: Date.now(), resultCount }, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => prev.filter(h => h.query !== query));
  }, []);

  const addBookmark = useCallback((query: string, label?: string) => {
    const id = crypto.randomUUID();
    setBookmarks(prev => {
      if (prev.some(b => b.query === query)) return prev;
      return [...prev, { id, query, label: label || query, createdAt: Date.now() }];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const isBookmarked = useCallback((query: string) => {
    return bookmarks.some(b => b.query === query);
  }, [bookmarks]);

  return { history, bookmarks, addToHistory, clearHistory, removeFromHistory, addBookmark, removeBookmark, isBookmarked };
}
