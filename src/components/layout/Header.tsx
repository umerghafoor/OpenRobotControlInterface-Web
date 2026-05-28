import { useState } from 'react'
import { useROS2Status } from '@/ros2/useROS2'
import { useTheme, THEMES } from '@/context/ThemeContext'
import './Header.css'

export function Header() {
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
  const statusText  = isConnected ? 'ROS2 Online' : isConnecting ? 'Connecting…' : status === 'error' ? 'ROS2 Error' : 'ROS2 Offline'
  const currentTheme = THEMES.find(t => t.id === prefs.theme)

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="header-logo">⚙</span>
        <span className="header-title">OpenRobotControl</span>
        <span className="header-subtitle">Open Source</span>
      </div>

      <div className="header-center">
        <div className={`ros2-status ${statusClass}`}>
          <span className={`dot dot-${isConnected ? 'green' : isConnecting ? 'yellow' : 'gray'}`} />
          {statusText}
        </div>
      </div>

      <div className="header-actions">
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
          <button className="btn btn-sm" onClick={() => setShowUrlInput(v => !v)} title="Set rosbridge URL">
            ⚙
          </button>
        )}
        <button
          className={`btn btn-sm ${isConnected ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleToggle}
          disabled={isConnecting}
        >
          {isConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect'}
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
          {currentTheme?.name ?? prefs.theme}
          <span className="header-theme-caret">▾</span>
        </button>
      </div>
    </header>
  )
}
