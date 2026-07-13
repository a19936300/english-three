import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const THEMES = ['light', 'dark', 'high-contrast'];
export const DEFAULT_THEME = 'light';
const STORAGE_KEY = 'pets3_theme';

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && THEMES.includes(v)) return v;
  } catch {
    // localStorage may be unavailable (private mode); fall through to default
  }
  return DEFAULT_THEME;
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  cycleTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore write failures
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((cur) => {
      const idx = THEMES.indexOf(cur);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, cycleTheme, themes: THEMES }),
    [theme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
