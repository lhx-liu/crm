import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getTheme, DEFAULT_THEME, THEME_LIST } from './themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem('crm-theme') || DEFAULT_THEME;
  });

  const theme = useMemo(() => getTheme(themeKey), [themeKey]);

  // 应用 CSS 变量到 :root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeKey);
    for (const [key, value] of Object.entries(theme.cssVars)) {
      root.style.setProperty(key, value);
    }
  }, [themeKey, theme]);

  const switchTheme = useCallback((key) => {
    setThemeKey(key);
    localStorage.setItem('crm-theme', key);
  }, []);

  const value = useMemo(() => ({
    themeKey,
    theme,
    switchTheme,
    themeList: THEME_LIST,
    isDark: themeKey === 'dark',
  }), [themeKey, theme, switchTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
