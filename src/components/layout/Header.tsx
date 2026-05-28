import { useState } from 'react'
import { useROS2Status } from '@/ros2/useROS2'
import { useTheme, THEMES } from '@/context/ThemeContext'
import { Icon } from '@/components/ui/Icon'
import './Header.css'

export type PanelId = 'motion' | 'command' | 'sensor' | 'video' | 'imu3d' | 'detection' | 'map' | 'twin'

const PANEL_ICONS: Record<PanelId, React.ReactElement> = {
  motion:    <Icon name="joystick"  size={13} />,
  command:   <Icon name="bolt"      size={13} />,
  sensor:    <Icon name="signal"    size={13} />,
  video:     <Icon name="camera"    size={13} />,
  imu3d:     <Icon name="compass"   size={13} />,
  detection: <Icon name="target"    size={13} />,
  map:       <Icon name="map"       size={13} />,
  twin:      <Icon name="robot"     size={13} />,
}

const PANEL_LABELS: Record<PanelId, string> = {
  motion:    'Motion',
  command:   'Command',
  sensor:    'Sensors',
  video:     'Video',
  imu3d:     'IMU 3D',
  detection: 'Detection',
  map:       'Map',
  twin:      'Twin',
}

interface HeaderProps {
  visible: Set<PanelId>
  onTogglePanel: (id: PanelId) => void
  onResetLayout: () => void
}

export function Header({ visible, onTogglePanel, onResetLayout }: HeaderProps) {
  const { status, connect, disconnect } = useROS2Status()
  const { prefs, openPreferences } = useTheme()
  const [url, setUrl] = useState('ws://localhost:9090')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  function handleToggle() {
    if (isConnected) disconnect()
    else connect(url)
  }

  const statusClass = isConnected ? 'connected' : status === 'error' ? 'error' : isConnecting ? 'connecting' : 'disconnected'
  const statusText  = isConnected ? 'Online' : isConnecting ? 'Connecting…' : status === 'error' ? 'Error' : 'Offline'
  const currentTheme = THEMES.find(t => t.id === prefs.theme)

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="header-brand">
        <span className="header-logo">
          <Icon name="robot" size={18} />
        </span>
        <span className="header-title">OpenRobotControl</span>
        <span className="header-subtitle">Open Source</span>
      </div>

      {/* Panel chips */}
      <div className="header-panels">
        <span className="header-panels-label">
          <Icon name="layout" size={11} />
          Panels
        </span>
        {(Object.keys(PANEL_ICONS) as PanelId[]).map(id => (
          <button
            key={id}
            className={`panel-chip ${visible.has(id) ? 'active' : ''}`}
            onClick={() => onTogglePanel(id)}
            title={PANEL_LABELS[id]}
          >
            {PANEL_ICONS[id]}
            <span className="panel-chip-label">{PANEL_LABELS[id]}</span>
          </button>
        ))}
        <button
          className="panel-chip reset-chip"
          onClick={onResetLayout}
          title="Reset layout"
        >
          <Icon name="reset" size={12} />
        </button>
      </div>

      {/* Right actions */}
      <div className="header-actions">
        {/* ROS2 status badge */}
        <div className={`ros2-status ${statusClass}`}>
          <span className={`dot dot-${isConnected ? 'green' : isConnecting ? 'yellow' : 'gray'}`} />
          <span>ROS2</span>
          <span className="ros2-status-text">{statusText}</span>
        </div>

        {showUrlInput && (
          <input
            className="url-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { setShowUrlInput(false); connect(url) }
              if (e.key === 'Escape') setShowUrlInput(false)
            }}
            placeholder="ws://localhost:9090"
            autoFocus
          />
        )}

        {!isConnected && (
          <button
            className="btn btn-sm header-icon-btn"
            onClick={() => setShowUrlInput(v => !v)}
            title="Set rosbridge URL"
          >
            <Icon name="gear" size={14} />
          </button>
        )}

        <button
          className={`btn btn-sm ${isConnected ? 'btn-danger' : 'btn-primary'} header-connect-btn`}
          onClick={handleToggle}
          disabled={isConnecting}
        >
          {isConnecting
            ? <><Icon name="loader" size={13} className="spin" />Connecting…</>
            : isConnected
              ? <><Icon name="plug-off" size={13} />Disconnect</>
              : <><Icon name="plug" size={13} />Connect</>
          }
        </button>

        <button
          className="btn btn-sm header-theme-btn"
          onClick={openPreferences}
          title={`Theme: ${currentTheme?.name ?? prefs.theme}`}
        >
          <span
            className="header-theme-dot"
            style={{ background: currentTheme?.preview.accent ?? 'var(--accent)' }}
          />
          <Icon name="palette" size={13} />
          <span className="header-theme-name">{currentTheme?.name ?? prefs.theme}</span>
          <Icon name="chevron-down" size={11} className="header-theme-caret" />
        </button>
      </div>
    </header>
  )
}
