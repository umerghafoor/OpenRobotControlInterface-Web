import { useEffect, useRef } from 'react'
import { useTheme, THEMES, type Preferences } from '@/context/ThemeContext'
import { Icon } from '@/components/ui/Icon'
import './PreferencesModal.css'

export function PreferencesModal() {
  const { prefs, setPrefs, showPreferences, closePreferences } = useTheme()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPreferences) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePreferences()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPreferences, closePreferences])

  if (!showPreferences) return null

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closePreferences()
  }

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs({ [key]: value })
  }

  return (
    <div className="pref-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="pref-modal" role="dialog" aria-label="Preferences">
        <div className="pref-header">
          <span className="pref-title">Preferences</span>
          <button className="pref-close btn btn-sm" onClick={closePreferences} aria-label="Close"><Icon name="x" size={14} /></button>
        </div>

        <div className="pref-body">

          {/* ── THEME PICKER ── */}
          <section className="pref-section">
            <div className="pref-section-label">Theme</div>
            <div className="pref-theme-grid">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`pref-theme-card ${prefs.theme === t.id ? 'active' : ''}`}
                  onClick={() => set('theme', t.id)}
                  title={t.description}
                >
                  <ThemePreviewSwatch preview={t.preview} />
                  <span className="pref-theme-name">{t.name}</span>
                  {prefs.theme === t.id && <span className="pref-theme-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="pref-theme-desc">
              {THEMES.find(t => t.id === prefs.theme)?.description}
            </div>
          </section>

          <div className="pref-divider" />

          {/* ── TYPOGRAPHY ── */}
          <section className="pref-section">
            <div className="pref-section-label">Font Size</div>
            <div className="pref-row">
              {([0.85, 1.0, 1.15] as const).map(scale => (
                <button
                  key={scale}
                  className={`pref-option-btn ${prefs.fontScale === scale ? 'active' : ''}`}
                  onClick={() => set('fontScale', scale)}
                >
                  {scale === 0.85 ? 'Small' : scale === 1.0 ? 'Default' : 'Large'}
                </button>
              ))}
            </div>
          </section>

          {/* ── BORDER RADIUS ── */}
          <section className="pref-section">
            <div className="pref-section-label">Corner Style</div>
            <div className="pref-row">
              {(['sharp', 'normal', 'rounded'] as const).map(r => (
                <button
                  key={r}
                  className={`pref-option-btn pref-radius-btn ${prefs.borderRadius === r ? 'active' : ''}`}
                  onClick={() => set('borderRadius', r)}
                  data-radius={r}
                >
                  <span className="pref-radius-preview" data-radius={r} />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* ── DENSITY ── */}
          <section className="pref-section">
            <div className="pref-section-label">Panel Density</div>
            <div className="pref-row">
              {(['compact', 'normal', 'relaxed'] as const).map(d => (
                <button
                  key={d}
                  className={`pref-option-btn ${prefs.panelDensity === d ? 'active' : ''}`}
                  onClick={() => set('panelDensity', d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </section>

          <div className="pref-divider" />

          {/* ── TOGGLES ── */}
          <section className="pref-section">
            <div className="pref-section-label">Visual Effects</div>
            <div className="pref-toggles">
              <ToggleRow
                label="Animations"
                description="Enable UI transitions and animations"
                checked={prefs.animationsEnabled}
                onChange={v => set('animationsEnabled', v)}
              />
              <ToggleRow
                label="Glow Effects"
                description="Ambient glow on accent elements"
                checked={prefs.glowEffects}
                onChange={v => set('glowEffects', v)}
              />
              <ToggleRow
                label="Scanlines"
                description="CRT scanline overlay — best with Terminal or Retro theme"
                checked={prefs.scanlineEffect}
                onChange={v => set('scanlineEffect', v)}
              />
            </div>
          </section>

        </div>

        <div className="pref-footer">
          <span className="pref-footer-hint">Changes apply instantly and persist across sessions</span>
          <button className="btn btn-primary btn-sm" onClick={closePreferences}>Done</button>
        </div>
      </div>
    </div>
  )
}

function ThemePreviewSwatch({ preview }: { preview: { bg: string; panel: string; accent: string; text: string; border: string } }) {
  return (
    <div className="pref-swatch" style={{ background: preview.bg, borderColor: preview.border }}>
      <div className="pref-swatch-panel" style={{ background: preview.panel, borderColor: preview.border }}>
        <div className="pref-swatch-header" style={{ background: preview.panel, borderColor: preview.border }}>
          <div className="pref-swatch-dot" style={{ background: preview.accent }} />
          <div className="pref-swatch-line" style={{ background: preview.text, opacity: 0.4 }} />
        </div>
        <div className="pref-swatch-body">
          <div className="pref-swatch-bar" style={{ background: preview.accent, opacity: 0.8 }} />
          <div className="pref-swatch-bar" style={{ background: preview.text, opacity: 0.2, width: '60%' }} />
          <div className="pref-swatch-bar" style={{ background: preview.text, opacity: 0.2, width: '40%' }} />
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label, description, checked, onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="pref-toggle-row">
      <div className="pref-toggle-info">
        <span className="pref-toggle-label">{label}</span>
        <span className="pref-toggle-desc">{description}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`pref-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="pref-toggle-thumb" />
      </button>
    </label>
  )
}
