export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'mahant-theme';
const listeners = new Set<() => void>();

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function getResolvedTheme(mode: ThemeMode = getThemeMode()): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

export function applyTheme(mode: ThemeMode = getThemeMode()) {
  if (typeof document === 'undefined') return;
  const resolved = getResolvedTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  listeners.forEach((fn) => fn());
}

export function toggleTheme() {
  setThemeMode(getResolvedTheme() === 'dark' ? 'light' : 'dark');
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initTheme() {
  applyTheme();
  if (typeof window === 'undefined') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getThemeMode() === 'system') {
      applyTheme('system');
      listeners.forEach((fn) => fn());
    }
  };
  mq.addEventListener('change', onChange);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      applyTheme();
      listeners.forEach((fn) => fn());
    }
  });
  window.addEventListener('beforeprint', () => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });
  window.addEventListener('afterprint', () => applyTheme());
}
