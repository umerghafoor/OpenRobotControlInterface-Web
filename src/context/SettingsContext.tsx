import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ─── Theme ────────────────────────────────────────────────────────────────────

export type ThemeId =
  | 'dark' | 'light' | 'midnight' | 'terminal'
  | 'solarized' | 'nord' | 'cyberpunk' | 'retro'
  | 'ocean' | 'high-contrast'

export interface ThemeInfo {
  id: ThemeId
  name: string
  description: string
  preview: { bg: string; panel: string; accent: string; text: string; border: string }
}

export const THEMES: ThemeInfo[] = [
  { id: 'dark',          name: 'Dark',          description: 'Default dark interface with indigo accents',           preview: { bg: '#0f1117', panel: '#1e2130', accent: '#6366f1', text: '#e2e8f0', border: '#2d3148' } },
  { id: 'light',         name: 'Light',         description: 'Clean light interface with indigo accents',            preview: { bg: '#f4f5f7', panel: '#ffffff', accent: '#4f46e5', text: '#111827', border: '#e5e7eb' } },
  { id: 'midnight',      name: 'Midnight',      description: 'Deep black with electric blue highlights',             preview: { bg: '#000814', panel: '#001233', accent: '#00b4d8', text: '#caf0f8', border: '#023e8a' } },
  { id: 'terminal',      name: 'Terminal',      description: 'Hacker green on pure black — classic CLI aesthetic',   preview: { bg: '#000000', panel: '#0a0a0a', accent: '#00ff41', text: '#00ff41', border: '#003b00' } },
  { id: 'solarized',     name: 'Solarized',     description: 'Solarized Dark — warm tones with precision contrast',  preview: { bg: '#002b36', panel: '#073642', accent: '#268bd2', text: '#839496', border: '#094555' } },
  { id: 'nord',          name: 'Nord',          description: 'Arctic frost — cool blue-grey Scandinavian palette',   preview: { bg: '#2e3440', panel: '#3b4252', accent: '#88c0d0', text: '#d8dee9', border: '#434c5e' } },
  { id: 'cyberpunk',     name: 'Cyberpunk',     description: 'Neon pink and cyan on near-black — dystopian future',  preview: { bg: '#0d0d0d', panel: '#1a0a1a', accent: '#ff2d78', text: '#f0e6ff', border: '#3d0a3d' } },
  { id: 'retro',         name: 'Retro',         description: 'Warm amber CRT — 1980s computer terminal vibes',       preview: { bg: '#1a1000', panel: '#221500', accent: '#ff9500', text: '#ffcc66', border: '#3d2b00' } },
  { id: 'ocean',         name: 'Ocean',         description: 'Deep sea blues with teal bioluminescence',             preview: { bg: '#0a1628', panel: '#0f2040', accent: '#06d6a0', text: '#b8d4e8', border: '#1a3a5c' } },
  { id: 'high-contrast', name: 'High Contrast', description: 'Maximum contrast — pure black, white, and vivid yellow', preview: { bg: '#000000', panel: '#0a0a0a', accent: '#ffff00', text: '#ffffff', border: '#444444' } },
]

// ─── Appearance prefs ─────────────────────────────────────────────────────────

export interface AppearancePrefs {
  theme: ThemeId
  fontScale: number
  borderRadius: 'sharp' | 'normal' | 'rounded'
  panelDensity: 'compact' | 'normal' | 'relaxed'
  animationsEnabled: boolean
  glowEffects: boolean
  scanlineEffect: boolean
}

const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: 'dark',
  fontScale: 1.0,
  borderRadius: 'normal',
  panelDensity: 'normal',
  animationsEnabled: true,
  glowEffects: false,
  scanlineEffect: false,
}

// ─── Connection settings ──────────────────────────────────────────────────────

export interface ConnectionSettings {
  bridgeUrl: string
  autoReconnect: boolean
  reconnectIntervalMs: number
}

const DEFAULT_CONNECTION: ConnectionSettings = {
  bridgeUrl: 'ws://localhost:9090',
  autoReconnect: false,
  reconnectIntervalMs: 3000,
}

// ─── Topic map ────────────────────────────────────────────────────────────────

export interface TopicEntry {
  key: string           // internal event key, e.g. "imu"
  label: string         // human name shown in UI
  topic: string         // ROS2 topic name, editable
  msgType: string       // message type string
  direction: 'sub' | 'pub'
  description: string
}

export const DEFAULT_TOPICS: TopicEntry[] = [
  // Publishers
  { key: 'cmd_vel',       label: 'Velocity Command',  topic: '/cmd_vel',             msgType: 'geometry_msgs/Twist',          direction: 'pub', description: 'Linear and angular velocity sent by Motion / Command widgets' },
  { key: 'robot_command', label: 'Robot Command',     topic: '/robot_command',       msgType: 'std_msgs/String',              direction: 'pub', description: 'Arbitrary string commands sent to the robot' },
  { key: 'servo1',        label: 'Servo 1 Angle',     topic: '/servo1/angle',        msgType: 'std_msgs/Int16',               direction: 'pub', description: 'Pan servo angle in degrees' },
  { key: 'servo2',        label: 'Servo 2 Angle',     topic: '/servo2/angle',        msgType: 'std_msgs/Int16',               direction: 'pub', description: 'Tilt servo angle in degrees' },
  { key: 'laser',         label: 'Laser Toggle',      topic: '/laser/cmd',           msgType: 'std_msgs/Bool',                direction: 'pub', description: 'Enable / disable laser' },
  // Subscribers
  { key: 'imu',           label: 'IMU Data',          topic: '/imu/data',            msgType: 'sensor_msgs/Imu',              direction: 'sub', description: 'Acceleration and angular velocity for IMU 3D widget' },
  { key: 'robot_status',  label: 'Robot Status',      topic: '/robot_status',        msgType: 'std_msgs/String',              direction: 'sub', description: 'Free-text status string from the robot' },
  { key: 'coordinates',   label: 'Coordinates',       topic: '/coordinates',         msgType: 'geometry_msgs/PointStamped',   direction: 'sub', description: 'Robot world position for map widget' },
  { key: 'coord_json',    label: 'Image Coordinates', topic: 'image/coordinates',    msgType: 'std_msgs/String',              direction: 'sub', description: 'JSON image-space coordinates' },
  { key: 'detections',    label: 'Detection Results', topic: '/detections/results',  msgType: 'std_msgs/String',              direction: 'sub', description: 'JSON object-detection results' },
  { key: 'cam_color',     label: 'Camera — Colour',   topic: '/camera/color_jpeg',   msgType: 'sensor_msgs/CompressedImage',  direction: 'sub', description: 'Compressed colour image stream' },
  { key: 'cam_raw',       label: 'Camera — Raw',      topic: 'camera/raw',           msgType: 'sensor_msgs/CompressedImage',  direction: 'sub', description: 'Unprocessed camera stream' },
  { key: 'cam_det',       label: 'Camera — Detection',topic: '/camera/detection',    msgType: 'sensor_msgs/CompressedImage',  direction: 'sub', description: 'Detection-overlay image stream' },
  { key: 'cam_depth',     label: 'Camera — Depth',    topic: '/camera/depth',        msgType: 'sensor_msgs/CompressedImage',  direction: 'sub', description: 'Depth image stream' },
]

export type TopicMap = Record<string, string>  // key → topic string

function defaultTopicMap(): TopicMap {
  const m: TopicMap = {}
  DEFAULT_TOPICS.forEach(t => { m[t.key] = t.topic })
  return m
}

// ─── Combined settings type ───────────────────────────────────────────────────

export interface Settings {
  appearance: AppearancePrefs
  connection: ConnectionSettings
  topicMap: TopicMap
}

const DEFAULT_SETTINGS: Settings = {
  appearance: DEFAULT_APPEARANCE,
  connection: DEFAULT_CONNECTION,
  topicMap: defaultTopicMap(),
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SettingsCtx {
  settings: Settings
  setAppearance: (p: Partial<AppearancePrefs>) => void
  setConnection: (p: Partial<ConnectionSettings>) => void
  setTopicMap: (map: TopicMap) => void
  showSettings: boolean
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
  initialTab: SettingsTab
}

export type SettingsTab = 'appearance' | 'connection' | 'topics'

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  setAppearance: () => {},
  setConnection: () => {},
  setTopicMap: () => {},
  showSettings: false,
  openSettings: () => {},
  closeSettings: () => {},
  initialTab: 'appearance',
})

function load(): Settings {
  try {
    const raw = localStorage.getItem('orc-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        appearance: { ...DEFAULT_APPEARANCE, ...parsed.appearance },
        connection: { ...DEFAULT_CONNECTION, ...parsed.connection },
        topicMap: { ...defaultTopicMap(), ...parsed.topicMap },
      }
    }
  } catch { /* ignore */ }
  // migrate legacy keys
  try {
    const legacyPrefs = localStorage.getItem('orc-prefs')
    if (legacyPrefs) {
      const lp = JSON.parse(legacyPrefs) as Partial<AppearancePrefs>
      return { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_APPEARANCE, ...lp } }
    }
    const legacyTheme = localStorage.getItem('orc-theme')
    if (legacyTheme) {
      return { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_APPEARANCE, theme: legacyTheme as ThemeId } }
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

function applyAppearance(a: AppearancePrefs) {
  const root = document.documentElement
  root.setAttribute('data-theme', a.theme)
  root.setAttribute('data-radius', a.borderRadius)
  root.setAttribute('data-density', a.panelDensity)
  root.style.setProperty('--font-scale', String(a.fontScale))
  root.classList.toggle('no-animations', !a.animationsEnabled)
  root.classList.toggle('glow-effects', a.glowEffects)
  root.classList.toggle('scanlines', a.scanlineEffect)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  const [showSettings, setShowSettings] = useState(false)
  const [initialTab, setInitialTab] = useState<SettingsTab>('appearance')

  useEffect(() => {
    applyAppearance(settings.appearance)
    localStorage.setItem('orc-settings', JSON.stringify(settings))
  }, [settings])

  function setAppearance(partial: Partial<AppearancePrefs>) {
    setSettings(prev => ({ ...prev, appearance: { ...prev.appearance, ...partial } }))
  }

  function setConnection(partial: Partial<ConnectionSettings>) {
    setSettings(prev => ({ ...prev, connection: { ...prev.connection, ...partial } }))
  }

  function setTopicMap(map: TopicMap) {
    setSettings(prev => ({ ...prev, topicMap: map }))
  }

  function openSettings(tab: SettingsTab = 'appearance') {
    setInitialTab(tab)
    setShowSettings(true)
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      setAppearance,
      setConnection,
      setTopicMap,
      showSettings,
      openSettings,
      closeSettings: () => setShowSettings(false),
      initialTab,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)

// Backwards-compat shim so old useTheme() callers still work without changes
export const useTheme = () => {
  const { settings, setAppearance, openSettings, showSettings, closeSettings } = useSettings()
  return {
    prefs: settings.appearance,
    setPrefs: setAppearance,
    showPreferences: showSettings,
    openPreferences: () => openSettings('appearance'),
    closePreferences: closeSettings,
  }
}
