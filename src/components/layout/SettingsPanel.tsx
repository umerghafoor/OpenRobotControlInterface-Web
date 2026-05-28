import { useEffect, useRef, useState } from 'react'
import {
  useSettings,
  THEMES,
  DEFAULT_TOPICS,
  type AppearancePrefs,
  type SettingsTab,
  type TopicMap,
} from '@/context/SettingsContext'
import { useROS2Status } from '@/ros2/useROS2'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Icon } from '@/components/ui/Icon'
import './SettingsPanel.css'

// ─── Shell ────────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const { showSettings, closeSettings, initialTab } = useSettings()
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const overlayRef = useRef<HTMLDivElement>(null)

  // sync tab when opened from different entry points
  useEffect(() => { if (showSettings) setTab(initialTab) }, [showSettings, initialTab])

  useEffect(() => {
    if (!showSettings) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSettings, closeSettings])

  if (!showSettings) return null

  const TABS: { id: SettingsTab; label: string; icon: React.ReactElement }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Icon name="palette"    size={14} /> },
    { id: 'connection', label: 'Connection', icon: <Icon name="wifi"       size={14} /> },
    { id: 'topics',     label: 'Topics',     icon: <Icon name="signal"     size={14} /> },
  ]

  return (
    <div
      className="sp-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) closeSettings() }}
    >
      <div className="sp-modal" role="dialog" aria-label="Settings">

        {/* Header */}
        <div className="sp-header">
          <div className="sp-header-left">
            <Icon name="gear" size={16} />
            <span className="sp-title">Settings</span>
          </div>
          <button className="sp-close btn btn-sm" onClick={closeSettings} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="sp-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`sp-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="sp-body">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'connection' && <ConnectionTab />}
          {tab === 'topics'     && <TopicsTab />}
        </div>

        {/* Footer */}
        <div className="sp-footer">
          <span className="sp-footer-hint">All changes persist across sessions</span>
          <button className="btn btn-primary btn-sm" onClick={closeSettings}>
            <Icon name="check" size={13} />
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Appearance ──────────────────────────────────────────────────────────

function AppearanceTab() {
  const { settings, setAppearance } = useSettings()
  const a = settings.appearance

  function set<K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) {
    setAppearance({ [key]: value })
  }

  return (
    <div className="sp-tab-content">

      <Section label="Theme">
        <div className="sp-theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`sp-theme-card ${a.theme === t.id ? 'active' : ''}`}
              onClick={() => set('theme', t.id)}
              title={t.description}
            >
              <ThemeSwatch preview={t.preview} />
              <span className="sp-theme-name">{t.name}</span>
              {a.theme === t.id && <Icon name="check" size={9} className="sp-theme-check" />}
            </button>
          ))}
        </div>
        <p className="sp-hint">{THEMES.find(t => t.id === a.theme)?.description}</p>
      </Section>

      <Divider />

      <div className="sp-row-3">
        <Section label="Font Size">
          <SegmentRow
            options={[
              { value: 0.85, label: 'Small' },
              { value: 1.0,  label: 'Default' },
              { value: 1.15, label: 'Large' },
            ]}
            value={a.fontScale}
            onChange={v => set('fontScale', v as number)}
          />
        </Section>

        <Section label="Corner Style">
          <SegmentRow
            options={[
              { value: 'sharp',   label: 'Sharp',   preview: <RadiusPreview r="sharp" /> },
              { value: 'normal',  label: 'Normal',  preview: <RadiusPreview r="normal" /> },
              { value: 'rounded', label: 'Rounded', preview: <RadiusPreview r="rounded" /> },
            ]}
            value={a.borderRadius}
            onChange={v => set('borderRadius', v as AppearancePrefs['borderRadius'])}
          />
        </Section>

        <Section label="Panel Density">
          <SegmentRow
            options={[
              { value: 'compact',  label: 'Compact' },
              { value: 'normal',   label: 'Normal' },
              { value: 'relaxed',  label: 'Relaxed' },
            ]}
            value={a.panelDensity}
            onChange={v => set('panelDensity', v as AppearancePrefs['panelDensity'])}
          />
        </Section>
      </div>

      <Divider />

      <Section label="Visual Effects">
        <div className="sp-toggles">
          <ToggleRow label="Animations"    desc="UI transitions and hover effects"            value={a.animationsEnabled} onChange={v => set('animationsEnabled', v)} />
          <ToggleRow label="Glow Effects"  desc="Ambient glow around accent elements"          value={a.glowEffects}       onChange={v => set('glowEffects', v)} />
          <ToggleRow label="CRT Scanlines" desc="Scanline overlay — best with Terminal / Retro" value={a.scanlineEffect}    onChange={v => set('scanlineEffect', v)} />
        </div>
      </Section>
    </div>
  )
}

// ─── Tab: Connection ──────────────────────────────────────────────────────────

function ConnectionTab() {
  const { settings, setConnection } = useSettings()
  const { status, connect, disconnect } = useROS2Status()
  const c = settings.connection
  const [urlDraft, setUrlDraft] = useState(c.bridgeUrl)

  const isConnected  = status === 'connected'
  const isConnecting = status === 'connecting'

  function applyAndConnect() {
    setConnection({ bridgeUrl: urlDraft })
    if (isConnected) disconnect()
    connect(urlDraft)
  }

  function handleDisconnect() { disconnect() }

  const statusLabel = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : status === 'error' ? 'Error' : 'Disconnected'
  const statusClass = isConnected ? 'connected' : isConnecting ? 'connecting' : status === 'error' ? 'error' : 'disconnected'

  return (
    <div className="sp-tab-content">

      <Section label="ROS2 Bridge">
        <div className="sp-connection-status">
          <div className={`sp-conn-badge ${statusClass}`}>
            <span className={`dot dot-${isConnected ? 'green' : isConnecting ? 'yellow' : 'gray'}`} />
            {statusLabel}
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-field-label">WebSocket URL</label>
          <div className="sp-field-row">
            <input
              className="sp-input"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyAndConnect() }}
              placeholder="ws://localhost:9090"
              spellCheck={false}
            />
            {isConnected
              ? <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
                  <Icon name="plug-off" size={13} />Disconnect
                </button>
              : <button className="btn btn-primary btn-sm" onClick={applyAndConnect} disabled={isConnecting}>
                  {isConnecting
                    ? <><Icon name="loader" size={13} className="spin" />Connecting…</>
                    : <><Icon name="plug" size={13} />Connect</>
                  }
                </button>
            }
          </div>
          <p className="sp-hint">rosbridge_server default is <code>ws://localhost:9090</code></p>
        </div>
      </Section>

      <Divider />

      <Section label="Reconnect">
        <div className="sp-toggles">
          <ToggleRow
            label="Auto-reconnect"
            desc="Automatically reconnect when the bridge drops"
            value={c.autoReconnect}
            onChange={v => setConnection({ autoReconnect: v })}
          />
        </div>
        {c.autoReconnect && (
          <div className="sp-field" style={{ marginTop: 12 }}>
            <label className="sp-field-label">Retry interval (ms)</label>
            <input
              className="sp-input sp-input-sm"
              type="number"
              min={500}
              max={30000}
              step={500}
              value={c.reconnectIntervalMs}
              onChange={e => setConnection({ reconnectIntervalMs: Number(e.target.value) })}
            />
          </div>
        )}
      </Section>

    </div>
  )
}

// ─── Tab: Topics ──────────────────────────────────────────────────────────────

function TopicsTab() {
  const { settings, setTopicMap } = useSettings()
  const [draft, setDraft] = useState<TopicMap>({ ...settings.topicMap })
  const [filter, setFilter] = useState<'all' | 'sub' | 'pub'>('all')
  const [search, setSearch] = useState('')
  const [edited, setEdited] = useState<Set<string>>(new Set())

  function update(key: string, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setEdited(prev => new Set(prev).add(key))
  }

  function apply() {
    setTopicMap(draft)
    ros2Bridge.applyTopicMap(draft)
    setEdited(new Set())
  }

  function reset() {
    const fresh: TopicMap = {}
    DEFAULT_TOPICS.forEach(t => { fresh[t.key] = t.topic })
    setDraft(fresh)
    setTopicMap(fresh)
    ros2Bridge.applyTopicMap(fresh)
    setEdited(new Set())
  }

  function resetOne(key: string) {
    const original = DEFAULT_TOPICS.find(t => t.key === key)?.topic ?? ''
    update(key, original)
  }

  const filtered = DEFAULT_TOPICS.filter(t => {
    if (filter !== 'all' && t.direction !== filter) return false
    if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.topic.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const hasEdits = edited.size > 0

  return (
    <div className="sp-tab-content sp-topics">

      <div className="sp-topics-toolbar">
        <div className="sp-filter-row">
          {(['all', 'sub', 'pub'] as const).map(f => (
            <button key={f} className={`sp-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'sub' ? <><Icon name="signal" size={12} /> Subscribe</> : <><Icon name="bolt" size={12} /> Publish</>}
            </button>
          ))}
        </div>
        <div className="sp-search-wrap">
          <Icon name="target" size={13} className="sp-search-icon" />
          <input
            className="sp-input sp-search-input"
            placeholder="Filter topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sp-topics-list">
        {filtered.map(t => {
          const current = draft[t.key] ?? t.topic
          const isEdited = edited.has(t.key)
          const isDefault = current === t.topic
          return (
            <div key={t.key} className={`sp-topic-row ${isEdited ? 'edited' : ''}`}>
              <div className="sp-topic-meta">
                <div className="sp-topic-header-row">
                  <span className={`sp-dir-badge ${t.direction}`}>
                    {t.direction === 'sub'
                      ? <><Icon name="signal" size={10} />SUB</>
                      : <><Icon name="bolt" size={10} />PUB</>}
                  </span>
                  <span className="sp-topic-label">{t.label}</span>
                  {isEdited && <span className="sp-edited-dot" title="Unsaved change" />}
                </div>
                <p className="sp-topic-desc">{t.description}</p>
                <code className="sp-msg-type">{t.msgType}</code>
              </div>
              <div className="sp-topic-input-wrap">
                <input
                  className={`sp-input sp-topic-input ${isEdited && !isDefault ? 'changed' : ''}`}
                  value={current}
                  onChange={e => update(t.key, e.target.value)}
                  spellCheck={false}
                />
                {!isDefault && (
                  <button className="sp-reset-one btn btn-sm" onClick={() => resetOne(t.key)} title="Reset to default">
                    <Icon name="reset" size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sp-topics-actions">
        {hasEdits && (
          <span className="sp-unsaved-hint">
            <Icon name="alert" size={13} />
            {edited.size} unsaved {edited.size === 1 ? 'change' : 'changes'}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={reset}>
          <Icon name="reset" size={13} />
          Reset all
        </button>
        <button className="btn btn-primary btn-sm" onClick={apply} disabled={!hasEdits}>
          <Icon name="check" size={13} />
          Apply
        </button>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sp-section">
      <div className="sp-section-label">{label}</div>
      {children}
    </div>
  )
}

function Divider() { return <div className="sp-divider" /> }

function SegmentRow<T extends string | number>({
  options, value, onChange,
}: {
  options: { value: T; label: string; preview?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="sp-segment">
      {options.map(o => (
        <button
          key={String(o.value)}
          className={`sp-seg-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.preview}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="sp-toggle-row">
      <div className="sp-toggle-info">
        <span className="sp-toggle-label">{label}</span>
        <span className="sp-toggle-desc">{desc}</span>
      </div>
      <button
        role="switch"
        aria-checked={value}
        className={`sp-toggle ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="sp-toggle-thumb" />
      </button>
    </label>
  )
}

function ThemeSwatch({ preview }: { preview: { bg: string; panel: string; accent: string; text: string; border: string } }) {
  return (
    <div className="sp-swatch" style={{ background: preview.bg, borderColor: preview.border }}>
      <div className="sp-swatch-panel" style={{ background: preview.panel, borderColor: preview.border }}>
        <div className="sp-swatch-header" style={{ borderColor: preview.border }}>
          <div className="sp-swatch-dot" style={{ background: preview.accent }} />
          <div className="sp-swatch-line" style={{ background: preview.text, opacity: 0.4 }} />
        </div>
        <div className="sp-swatch-body">
          <div className="sp-swatch-bar" style={{ background: preview.accent, opacity: 0.8 }} />
          <div className="sp-swatch-bar" style={{ background: preview.text, opacity: 0.2, width: '60%' }} />
          <div className="sp-swatch-bar" style={{ background: preview.text, opacity: 0.2, width: '40%' }} />
        </div>
      </div>
    </div>
  )
}

function RadiusPreview({ r }: { r: 'sharp' | 'normal' | 'rounded' }) {
  const rx = r === 'sharp' ? '1px' : r === 'normal' ? '5px' : '10px'
  return <span className="sp-radius-preview" style={{ borderRadius: rx }} />
}
