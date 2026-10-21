import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_THEME_KEY = 'synctone_theme';
const STORAGE_FONT_KEY = 'synctone_font_family';
const STORAGE_FONT_SIZE_KEY = 'synctone_font_size';

const THEME_CYCLE = ['dark', 'sepia', 'light'];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      if (saved === 'dark' || saved === 'sepia' || saved === 'light') return saved;
    }
    return 'dark';
  });

  const [fontFamily, setFontFamilyState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_FONT_KEY);
      if (saved === 'sans' || saved === 'serif') return saved;
    }
    return 'sans';
  });

  const [fontSize, setFontSizeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(localStorage.getItem(STORAGE_FONT_SIZE_KEY), 10);
      if (!isNaN(saved) && saved >= 14 && saved <= 24) return saved;
    }
    return 16;
  });

  const [readerWidth, setReaderWidth] = useState('standard'); // 'standard' (max-w-3xl) | 'wide' (max-w-5xl)

  // Apply theme to document element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark', 'sepia', 'light');
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch (_) {}
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === 'dark' || newTheme === 'sepia' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((curr) => {
      const idx = THEME_CYCLE.indexOf(curr);
      return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    });
  }, []);

  const setFontFamily = useCallback((newFont) => {
    if (newFont === 'sans' || newFont === 'serif') {
      setFontFamilyState(newFont);
      try {
        localStorage.setItem(STORAGE_FONT_KEY, newFont);
      } catch (_) {}
    }
  }, []);

  const toggleFontFamily = useCallback(() => {
    setFontFamilyState((prev) => (prev === 'sans' ? 'serif' : 'sans'));
  }, []);

  const setFontSize = useCallback((updater) => {
    setFontSizeState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const clamped = Math.max(14, Math.min(24, next));
      try {
        localStorage.setItem(STORAGE_FONT_SIZE_KEY, clamped.toString());
      } catch (_) {}
      return clamped;
    });
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize((prev) => Math.min(24, prev + 2));
  }, [setFontSize]);

  const decreaseFontSize = useCallback(() => {
    setFontSize((prev) => Math.max(14, prev - 2));
  }, [setFontSize]);

  const toggleReaderWidth = useCallback(() => {
    setReaderWidth((prev) => (prev === 'standard' ? 'wide' : 'standard'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      cycleTheme,
      fontFamily,
      setFontFamily,
      toggleFontFamily,
      fontSize,
      setFontSize,
      increaseFontSize,
      decreaseFontSize,
      readerWidth,
      setReaderWidth,
      toggleReaderWidth,
      isDark: theme === 'dark',
      isSepia: theme === 'sepia',
      isLight: theme === 'light',
    }),
    [
      theme,
      setTheme,
      cycleTheme,
      fontFamily,
      setFontFamily,
      toggleFontFamily,
      fontSize,
      setFontSize,
      increaseFontSize,
      decreaseFontSize,
      readerWidth,
      setReaderWidth,
      toggleReaderWidth,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const DEFAULT_THEME_CONTEXT = {
  theme: 'dark',
  setTheme: () => {},
  cycleTheme: () => {},
  fontFamily: 'serif',
  setFontFamily: () => {},
  toggleFontFamily: () => {},
  fontSize: 16,
  setFontSize: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  readerWidth: 'standard',
  setReaderWidth: () => {},
  toggleReaderWidth: () => {},
  isDark: true,
  isSepia: false,
  isLight: false,
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx || DEFAULT_THEME_CONTEXT;
}

export default useTheme;
