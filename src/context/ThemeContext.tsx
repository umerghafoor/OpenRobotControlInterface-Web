import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeId =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'terminal'
  | 'solarized'
  | 'nord'
  | 'cyberpunk'
  | 'retro'
  | 'ocean'
  | 'material-expressive'
  | 'high-contrast'

export interface ThemeInfo {
  id: ThemeId
  name: string
  description: string
  preview: {
    bg: string
    panel: string
    accent: string
    text: string
    border: string
  }
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark interface with indigo accents',
    preview: { bg: '#0f1117', panel: '#1e2130', accent: '#6366f1', text: '#e2e8f0', border: '#2d3148' },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light interface with indigo accents',
    preview: { bg: '#f4f5f7', panel: '#ffffff', accent: '#4f46e5', text: '#111827', border: '#e5e7eb' },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep black with electric blue highlights',
    preview: { bg: '#000814', panel: '#001233', accent: '#00b4d8', text: '#caf0f8', border: '#023e8a' },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Hacker green on pure black — classic CLI aesthetic',
    preview: { bg: '#000000', panel: '#0a0a0a', accent: '#00ff41', text: '#00ff41', border: '#003b00' },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Solarized Dark — warm tones with precision contrast',
    preview: { bg: '#002b36', panel: '#073642', accent: '#268bd2', text: '#839496', border: '#094555' },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic frost — cool blue-grey Scandinavian palette',
    preview: { bg: '#2e3440', panel: '#3b4252', accent: '#88c0d0', text: '#d8dee9', border: '#434c5e' },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon pink and cyan on near-black — dystopian future',
    preview: { bg: '#0d0d0d', panel: '#1a0a1a', accent: '#ff2d78', text: '#f0e6ff', border: '#3d0a3d' },
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Warm amber CRT — 1980s computer terminal vibes',
    preview: { bg: '#1a1000', panel: '#221500', accent: '#ff9500', text: '#ffcc66', border: '#3d2b00' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep sea blues with teal bioluminescence',
    preview: { bg: '#0a1628', panel: '#0f2040', accent: '#06d6a0', text: '#b8d4e8', border: '#1a3a5c' },
  },
  {
    id: 'material-expressive',
    name: 'Material',
    description: 'Google Material 3 Expressive — bold purple accents, no shadows',
    preview: { bg: '#1c1b1f', panel: '#2b2930', accent: '#d0bcff', text: '#e6e1e5', border: '#49454f' },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum contrast — pure black, white, and vivid yellow',
    preview: { bg: '#000000', panel: '#0a0a0a', accent: '#ffff00', text: '#ffffff', border: '#444444' },
  },
]

export interface Preferences {
  theme: ThemeId
  fontScale: number        // 0.85 | 1.0 | 1.15
  borderRadius: 'sharp' | 'normal' | 'rounded'
  panelDensity: 'compact' | 'normal' | 'relaxed'
  animationsEnabled: boolean
  glowEffects: boolean
  scanlineEffect: boolean
}

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  fontScale: 1.0,
  borderRadius: 'normal',
  panelDensity: 'normal',
  animationsEnabled: true,
  glowEffects: false,
  scanlineEffect: false,
}

interface ThemeCtx {
  prefs: Preferences
  setPrefs: (p: Partial<Preferences>) => void
  showPreferences: boolean
  openPreferences: () => void
  closePreferences: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  prefs: DEFAULT_PREFS,
  setPrefs: () => {},
  showPreferences: false,
  openPreferences: () => {},
  closePreferences: () => {},
})

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem('orc-prefs')
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  // migrate legacy theme key
  const legacy = localStorage.getItem('orc-theme') as ThemeId | null
  if (legacy && THEMES.find(t => t.id === legacy)) return { ...DEFAULT_PREFS, theme: legacy }
  return DEFAULT_PREFS
}

function applyPrefs(p: Preferences) {
  const root = document.documentElement
  root.setAttribute('data-theme', p.theme)
  root.setAttribute('data-radius', p.borderRadius)
  root.setAttribute('data-density', p.panelDensity)
  root.style.setProperty('--font-scale', String(p.fontScale))
  root.classList.toggle('no-animations', !p.animationsEnabled)
  root.classList.toggle('glow-effects', p.glowEffects)
  root.classList.toggle('scanlines', p.scanlineEffect)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(loadPrefs)
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    applyPrefs(prefs)
    localStorage.setItem('orc-prefs', JSON.stringify(prefs))
  }, [prefs])

  function setPrefs(partial: Partial<Preferences>) {
    setPrefsState(prev => ({ ...prev, ...partial }))
  }

  return (
    <ThemeContext.Provider value={{
      prefs,
      setPrefs,
      showPreferences,
      openPreferences: () => setShowPreferences(true),
      closePreferences: () => setShowPreferences(false),
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
