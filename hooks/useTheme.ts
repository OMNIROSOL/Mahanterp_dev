import { useEffect, useState } from 'react';
import {
  ThemeMode,
  getResolvedTheme,
  getThemeMode,
  setThemeMode,
  subscribeTheme,
  toggleTheme,
} from '../utils/theme';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(getResolvedTheme);

  useEffect(() => {
    const sync = () => {
      setMode(getThemeMode());
      setResolved(getResolvedTheme());
    };
    sync();
    return subscribeTheme(sync);
  }, []);

  return {
    mode,
    resolved,
    isDark: resolved === 'dark',
    setTheme: setThemeMode,
    toggle: toggleTheme,
  };
}
