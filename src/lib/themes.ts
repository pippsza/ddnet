export interface ThemeDefinition {
  id: string
  name: string
  mode: 'light' | 'dark'
  /** Hidden themes don't appear in the settings theme selector */
  hidden?: boolean
  /** Hex preview colors for theme cards in settings */
  preview: {
    background: string
    foreground: string
    card: string
    primary: string
    muted: string
    border: string
  }
}

export const themes: ThemeDefinition[] = [
  // ── Light themes ──
  {
    id: 'default-light',
    name: 'Default Light',
    mode: 'light',
    preview: {
      background: '#fbfbfb',
      foreground: '#1a1a1a',
      card: '#fbfbfb',
      primary: '#4dd4ac',
      muted: '#ededed',
      border: '#d9d9d9',
    },
  },
  {
    id: 'ddnet',
    name: 'DDNet Classic',
    mode: 'light',
    preview: {
      background: '#d8efff',
      foreground: '#111111',
      card: '#ffffff',
      primary: '#882222',
      muted: '#c8dff0',
      border: '#aaaaaa',
    },
  },
  {
    id: 'cream',
    name: 'Cream',
    mode: 'light',
    preview: {
      background: '#faf6f0',
      foreground: '#2d2418',
      card: '#fffcf7',
      primary: '#b8860b',
      muted: '#f0e8d8',
      border: '#ddd0b8',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    mode: 'light',
    preview: {
      background: '#f3f0fa',
      foreground: '#1e1830',
      card: '#faf8ff',
      primary: '#7c3aed',
      muted: '#e8e0f8',
      border: '#cfc4e8',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    mode: 'light',
    preview: {
      background: '#fdf2f4',
      foreground: '#2d1018',
      card: '#fff8f9',
      primary: '#e11d48',
      muted: '#fce4e8',
      border: '#f0c8d0',
    },
  },
  {
    id: 'ddnet-dark',
    name: 'DDNet Dark',
    mode: 'dark',
    preview: {
      background: '#2d2d2d',
      foreground: '#dfdede',
      card: '#555555',
      primary: '#ffa500',
      muted: '#3a3a3a',
      border: '#1a1a1a',
    },
  },
  // ── Dark themes ──
  {
    id: 'default-dark',
    name: 'Default Dark',
    mode: 'dark',
    preview: {
      background: '#1a1a1a',
      foreground: '#e8e8f0',
      card: '#222222',
      primary: '#2d8a6e',
      muted: '#2a2a2a',
      border: '#333333',
    },
  },
  {
    id: 'ddstats',
    name: 'DDStats',
    mode: 'dark',
    preview: {
      background: '#121212',
      foreground: '#dddddd',
      card: '#1a1a1a',
      primary: '#d39c00',
      muted: '#222222',
      border: '#333333',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    preview: {
      background: '#0f1729',
      foreground: '#e0e8ff',
      card: '#152040',
      primary: '#6096ff',
      muted: '#1a2540',
      border: '#253560',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    mode: 'dark',
    preview: {
      background: '#0c1b1e',
      foreground: '#d8f0f0',
      card: '#122428',
      primary: '#14b8a6',
      muted: '#182c30',
      border: '#1e3a40',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    preview: {
      background: '#0e1a10',
      foreground: '#d8ecd8',
      card: '#142018',
      primary: '#22c55e',
      muted: '#1a2c1c',
      border: '#243828',
    },
  },
  // ── Internal themes (not shown in settings) ──
  {
    id: 'map-active',
    name: 'Map Active',
    mode: 'dark',
    hidden: true,
    preview: {
      background: '#0a0a0a',
      foreground: '#d8ecd8',
      card: '#000000',
      primary: '#1a6b3c',
      muted: '#111111',
      border: '#1a1a1a',
    },
  },
]

/** Map theme id → CSS class applied to <html> (must be single class, no spaces) */
export const themeClassMap: Record<string, string> = {
  'default-light': 'light',
  ddnet: 'theme-ddnet',
  cream: 'theme-cream',
  lavender: 'theme-lavender',
  rose: 'theme-rose',
  'ddnet-dark': 'theme-ddnet-dark',
  'default-dark': 'dark',
  ddstats: 'theme-ddstats',
  midnight: 'theme-midnight',
  ocean: 'theme-ocean',
  forest: 'theme-forest',
  'map-active': 'theme-map-active',
}

export const themeIds = themes.map((t) => t.id)

/** User-facing themes (excludes hidden/internal themes like map-active) */
export const userThemes = themes.filter((t) => !t.hidden)

/** Theme ID for the forced map background theme */
export const MAP_ACTIVE_THEME = 'map-active'

export function getThemeById(id: string) {
  return themes.find((t) => t.id === id)
}

export function getNextTheme(currentId: string): ThemeDefinition {
  const idx = themes.findIndex((t) => t.id === currentId)
  return themes[(idx + 1) % themes.length]
}

// ── Preferred theme helpers (localStorage) ──

const PREFERRED_LIGHT_KEY = 'preferred-light-theme'
const PREFERRED_DARK_KEY = 'preferred-dark-theme'

const DEFAULT_LIGHT = 'default-light'
const DEFAULT_DARK = 'default-dark'

/** Save the user's preferred theme for its mode (light or dark) */
export function savePreferredTheme(themeId: string) {
  const theme = getThemeById(themeId)
  if (!theme || theme.hidden) return
  const key = theme.mode === 'light' ? PREFERRED_LIGHT_KEY : PREFERRED_DARK_KEY
  localStorage.setItem(key, themeId)
}

/** Get the stored preferred theme for a given mode */
export function getPreferredTheme(mode: 'light' | 'dark'): string {
  if (typeof window === 'undefined') return mode === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK
  const key = mode === 'light' ? PREFERRED_LIGHT_KEY : PREFERRED_DARK_KEY
  return localStorage.getItem(key) || (mode === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK)
}

/** Get the opposite-mode theme for toggling */
export function getToggleTarget(currentId: string): string {
  const current = getThemeById(currentId)
  const targetMode = current?.mode === 'light' ? 'dark' : 'light'
  return getPreferredTheme(targetMode)
}
