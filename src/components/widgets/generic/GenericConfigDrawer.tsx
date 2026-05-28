/**
 * Slide-in drawer for configuring a generic widget.
 * Renders type-specific sections based on widget.type.
 */

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type {
  GenericWidget, GenericWidgetType,
  SliderDef, ButtonDef, DisplayDef, GraphSeriesDef, GaugeDef,
} from '@/context/GenericWidgetContext'
import { defaultWidget } from '@/context/GenericWidgetContext'
import './GenericConfigDrawer.css'

interface DrawerProps {
  widget: GenericWidget
  onClose:  () => void
  onSave:   (patch: Partial<GenericWidget>) => void
  onDelete: () => void
}

function uid() { return Math.random().toString(36).slice(2, 8) }

const ICON_OPTIONS = ['bolt','signal','compass','target','map','robot','camera','gear','palette','joystick','eye','alert','check','refresh','wifi','plug']

const COLOR_OPTIONS = [
  { label: 'Accent',  value: 'var(--accent)'  },
  { label: 'Success', value: 'var(--success)'  },
  { label: 'Warning', value: 'var(--warning)'  },
  { label: 'Error',   value: 'var(--error)'    },
  { label: 'Blue',    value: '#60a5fa'          },
  { label: 'Purple',  value: '#a78bfa'          },
  { label: 'Teal',    value: '#06b6d4'          },
]

const BTN_VARIANTS = ['default','primary','danger','success','warning','ghost'] as const

export function GenericConfigDrawer({ widget, onClose, onSave, onDelete }: DrawerProps) {
  const [draft, setDraft] = useState<GenericWidget>(JSON.parse(JSON.stringify(widget)))

  function save() { onSave(draft); onClose() }

  function setTop<K extends keyof GenericWidget>(k: K, v: GenericWidget[K]) {
    setDraft(d => ({ ...d, [k]: v }))
  }

  return (
    <div className="gcd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gcd-drawer">

        {/* Header */}
        <div className="gcd-header">
          <span className="gcd-title">Configure — {draft.name}</span>
          <button className="gcd-close" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div className="gcd-body">

          {/* Name + Icon row */}
          <div className="gcd-section">
            <div className="gcd-section-label">Widget</div>
            <div className="gcd-row">
              <div className="gcd-field" style={{ flex: 2 }}>
                <label className="gcd-label">Name</label>
                <input className="gcd-input" value={draft.name} onChange={e => setTop('name', e.target.value)} />
              </div>
              <div className="gcd-field">
                <label className="gcd-label">Icon</label>
                <select className="gcd-select" value={draft.icon} onChange={e => setTop('icon', e.target.value)}>
                  {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Type-specific sections */}
          {draft.type === 'sliders' && draft.sliders && (
            <SliderConfig
              defs={draft.sliders.defs}
              onChange={defs => setDraft(d => ({ ...d, sliders: { defs } }))}
            />
          )}

          {draft.type === 'buttons' && draft.buttons && (
            <ButtonConfig
              defs={draft.buttons.defs}
              columns={draft.buttons.columns}
              onChange={(defs, columns) => setDraft(d => ({ ...d, buttons: { defs, columns } }))}
            />
          )}

          {draft.type === 'display' && draft.displays && (
            <DisplayConfig
              defs={draft.displays.defs}
              columns={draft.displays.columns}
              onChange={(defs, columns) => setDraft(d => ({ ...d, displays: { defs, columns } }))}
            />
          )}

          {draft.type === 'graph' && draft.graph && (
            <GraphConfig
              series={draft.graph.series}
              historyLen={draft.graph.historyLen}
              showGrid={draft.graph.showGrid}
              showAxes={draft.graph.showAxes}
              onChange={g => setDraft(d => ({ ...d, graph: { ...d.graph!, ...g } }))}
            />
          )}

          {draft.type === 'gauge' && draft.gauges && (
            <GaugeConfig
              defs={draft.gauges.defs}
              columns={draft.gauges.columns}
              onChange={(defs, columns) => setDraft(d => ({ ...d, gauges: { defs, columns } }))}
            />
          )}

        </div>

        {/* Footer */}
        <div className="gcd-footer">
          <button className="gcd-delete-btn" onClick={onDelete}>
            <Icon name="x" size={13} />Delete
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={save}>
            <Icon name="check" size={13} />Save
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Slider config section ────────────────────────────────────────────────────

function SliderConfig({ defs, onChange }: { defs: SliderDef[]; onChange: (d: SliderDef[]) => void }) {
  function update(id: string, k: keyof SliderDef, v: unknown) {
    onChange(defs.map(d => d.id === id ? { ...d, [k]: v } : d))
  }
  function add()        { onChange([...defs, { id: uid(), label: 'Slider', min: 0, max: 1, step: 0.01, unit: '', bipolar: false }]) }
  function remove(id: string) { onChange(defs.filter(d => d.id !== id)) }

  return (
    <div className="gcd-section">
      <div className="gcd-section-label">Sliders
        <button className="gcd-add-btn" onClick={add} disabled={defs.length >= 4}><Icon name="check" size={11} />Add</button>
      </div>
      {defs.map(d => (
        <div key={d.id} className="gcd-item-card">
          <div className="gcd-row">
            <Field label="Label">
              <input className="gcd-input" value={d.label} onChange={e => update(d.id, 'label', e.target.value)} />
            </Field>
            <Field label="Unit">
              <input className="gcd-input gcd-input-sm" value={d.unit} onChange={e => update(d.id, 'unit', e.target.value)} />
            </Field>
          </div>
          <div className="gcd-row">
            <Field label="Min">
              <input className="gcd-input gcd-input-sm" type="number" value={d.min} onChange={e => update(d.id, 'min', +e.target.value)} />
            </Field>
            <Field label="Max">
              <input className="gcd-input gcd-input-sm" type="number" value={d.max} onChange={e => update(d.id, 'max', +e.target.value)} />
            </Field>
            <Field label="Step">
              <input className="gcd-input gcd-input-sm" type="number" value={d.step} onChange={e => update(d.id, 'step', +e.target.value)} />
            </Field>
            <CheckField label="Bipolar" checked={d.bipolar} onChange={v => update(d.id, 'bipolar', v)} />
          </div>
          {defs.length > 1 && (
            <button className="gcd-remove-btn" onClick={() => remove(d.id)}><Icon name="x" size={11} /></button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Button config section ────────────────────────────────────────────────────

function ButtonConfig({ defs, columns, onChange }: { defs: ButtonDef[]; columns: 1|2|3; onChange: (d: ButtonDef[], c: 1|2|3) => void }) {
  function update(id: string, k: keyof ButtonDef, v: unknown) { onChange(defs.map(d => d.id === id ? { ...d, [k]: v } : d), columns) }
  function add()   { onChange([...defs, { id: uid(), label: 'Button', variant: 'default', command: 'CMD' }], columns) }
  function remove(id: string) { onChange(defs.filter(d => d.id !== id), columns) }

  return (
    <div className="gcd-section">
      <div className="gcd-section-label">Buttons
        <button className="gcd-add-btn" onClick={add} disabled={defs.length >= 8}><Icon name="check" size={11} />Add</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Columns</span>
        {([1,2,3] as const).map(c => (
          <button key={c} className={`gcd-seg-btn ${columns === c ? 'active' : ''}`} onClick={() => onChange(defs, c)}>{c}</button>
        ))}
      </div>
      {defs.map(d => (
        <div key={d.id} className="gcd-item-card">
          <div className="gcd-row">
            <Field label="Label">
              <input className="gcd-input" value={d.label} onChange={e => update(d.id, 'label', e.target.value)} />
            </Field>
            <Field label="Command">
              <input className="gcd-input" value={d.command} onChange={e => update(d.id, 'command', e.target.value)} />
            </Field>
          </div>
          <div className="gcd-row">
            <Field label="Variant">
              <select className="gcd-select" value={d.variant} onChange={e => update(d.id, 'variant', e.target.value)}>
                {BTN_VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Icon">
              <select className="gcd-select" value={d.icon ?? ''} onChange={e => update(d.id, 'icon', e.target.value || undefined)}>
                <option value="">none</option>
                {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
          </div>
          {defs.length > 1 && <button className="gcd-remove-btn" onClick={() => remove(d.id)}><Icon name="x" size={11} /></button>}
        </div>
      ))}
    </div>
  )
}

// ─── Display config section ───────────────────────────────────────────────────

function DisplayConfig({ defs, columns, onChange }: { defs: DisplayDef[]; columns: 1|2; onChange: (d: DisplayDef[], c: 1|2) => void }) {
  function update(id: string, k: keyof DisplayDef, v: unknown) { onChange(defs.map(d => d.id === id ? { ...d, [k]: v } : d), columns) }
  function add()   { onChange([...defs, { id: uid(), label: 'Value', unit: '', rosKey: 'robotStatus', showBar: false, barMin: 0, barMax: 100, color: '', size: 'md' }], columns) }
  function remove(id: string) { onChange(defs.filter(d => d.id !== id), columns) }

  return (
    <div className="gcd-section">
      <div className="gcd-section-label">Value Displays
        <button className="gcd-add-btn" onClick={add} disabled={defs.length >= 6}><Icon name="check" size={11} />Add</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Columns</span>
        {([1,2] as const).map(c => (
          <button key={c} className={`gcd-seg-btn ${columns === c ? 'active' : ''}`} onClick={() => onChange(defs, c)}>{c}</button>
        ))}
      </div>
      {defs.map(d => (
        <div key={d.id} className="gcd-item-card">
          <div className="gcd-row">
            <Field label="Label">
              <input className="gcd-input" value={d.label} onChange={e => update(d.id, 'label', e.target.value)} />
            </Field>
            <Field label="Unit">
              <input className="gcd-input gcd-input-sm" value={d.unit} onChange={e => update(d.id, 'unit', e.target.value)} />
            </Field>
            <Field label="Size">
              <select className="gcd-select" value={d.size} onChange={e => update(d.id, 'size', e.target.value)}>
                {['sm','md','lg'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="gcd-row">
            <Field label="Color">
              <select className="gcd-select" value={d.color} onChange={e => update(d.id, 'color', e.target.value)}>
                <option value="">Default</option>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <CheckField label="Bar" checked={d.showBar} onChange={v => update(d.id, 'showBar', v)} />
            {d.showBar && <>
              <Field label="Min"><input className="gcd-input gcd-input-sm" type="number" value={d.barMin} onChange={e => update(d.id, 'barMin', +e.target.value)} /></Field>
              <Field label="Max"><input className="gcd-input gcd-input-sm" type="number" value={d.barMax} onChange={e => update(d.id, 'barMax', +e.target.value)} /></Field>
            </>}
          </div>
          {defs.length > 1 && <button className="gcd-remove-btn" onClick={() => remove(d.id)}><Icon name="x" size={11} /></button>}
        </div>
      ))}
    </div>
  )
}

// ─── Graph config section ─────────────────────────────────────────────────────

function GraphConfig({ series, historyLen, showGrid, showAxes, onChange }: {
  series: GraphSeriesDef[]; historyLen: number; showGrid: boolean; showAxes: boolean
  onChange: (g: { series?: GraphSeriesDef[]; historyLen?: number; showGrid?: boolean; showAxes?: boolean }) => void
}) {
  function updateSeries(id: string, k: keyof GraphSeriesDef, v: unknown) {
    onChange({ series: series.map(s => s.id === id ? { ...s, [k]: v } : s) })
  }
  function add()   { onChange({ series: [...series, { id: uid(), label: 'New', rosKey: 'imuData', color: 'var(--accent)', fill: false }] }) }
  function remove(id: string) { onChange({ series: series.filter(s => s.id !== id) }) }

  return (
    <div className="gcd-section">
      <div className="gcd-section-label">Graph Series
        <button className="gcd-add-btn" onClick={add} disabled={series.length >= 4}><Icon name="check" size={11} />Add</button>
      </div>
      <div className="gcd-row">
        <CheckField label="Grid"  checked={showGrid} onChange={v => onChange({ showGrid: v })} />
        <CheckField label="Axes"  checked={showAxes} onChange={v => onChange({ showAxes: v })} />
        <Field label="History">
          <input className="gcd-input gcd-input-sm" type="number" min={20} max={500} value={historyLen} onChange={e => onChange({ historyLen: +e.target.value })} />
        </Field>
      </div>
      {series.map(s => (
        <div key={s.id} className="gcd-item-card">
          <div className="gcd-row">
            <Field label="Label">
              <input className="gcd-input" value={s.label} onChange={e => updateSeries(s.id, 'label', e.target.value)} />
            </Field>
            <Field label="Color">
              <select className="gcd-select" value={s.color} onChange={e => updateSeries(s.id, 'color', e.target.value)}>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <CheckField label="Fill" checked={s.fill} onChange={v => updateSeries(s.id, 'fill', v)} />
          </div>
          {series.length > 1 && <button className="gcd-remove-btn" onClick={() => remove(s.id)}><Icon name="x" size={11} /></button>}
        </div>
      ))}
    </div>
  )
}

// ─── Gauge config section ─────────────────────────────────────────────────────

function GaugeConfig({ defs, columns, onChange }: { defs: GaugeDef[]; columns: 1|2|3; onChange: (d: GaugeDef[], c: 1|2|3) => void }) {
  function update(id: string, k: keyof GaugeDef, v: unknown) { onChange(defs.map(d => d.id === id ? { ...d, [k]: v } : d), columns) }
  function add()   { onChange([...defs, { id: uid(), label: 'Value', unit: '%', rosKey: 'robotStatus', min: 0, max: 100, warnAt: 0.75, dangerAt: 0.9, color: 'var(--accent)' }], columns) }
  function remove(id: string) { onChange(defs.filter(d => d.id !== id), columns) }

  return (
    <div className="gcd-section">
      <div className="gcd-section-label">Gauges
        <button className="gcd-add-btn" onClick={add} disabled={defs.length >= 3}><Icon name="check" size={11} />Add</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Columns</span>
        {([1,2,3] as const).map(c => (
          <button key={c} className={`gcd-seg-btn ${columns === c ? 'active' : ''}`} onClick={() => onChange(defs, c)}>{c}</button>
        ))}
      </div>
      {defs.map(d => (
        <div key={d.id} className="gcd-item-card">
          <div className="gcd-row">
            <Field label="Label"><input className="gcd-input" value={d.label} onChange={e => update(d.id, 'label', e.target.value)} /></Field>
            <Field label="Unit"><input className="gcd-input gcd-input-sm" value={d.unit} onChange={e => update(d.id, 'unit', e.target.value)} /></Field>
            <Field label="Color">
              <select className="gcd-select" value={d.color} onChange={e => update(d.id, 'color', e.target.value)}>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="gcd-row">
            <Field label="Min"><input className="gcd-input gcd-input-sm" type="number" value={d.min} onChange={e => update(d.id, 'min', +e.target.value)} /></Field>
            <Field label="Max"><input className="gcd-input gcd-input-sm" type="number" value={d.max} onChange={e => update(d.id, 'max', +e.target.value)} /></Field>
            <Field label="Warn%"><input className="gcd-input gcd-input-sm" type="number" step={0.05} min={0} max={1} value={d.warnAt} onChange={e => update(d.id, 'warnAt', +e.target.value)} /></Field>
          </div>
          {defs.length > 1 && <button className="gcd-remove-btn" onClick={() => remove(d.id)}><Icon name="x" size={11} /></button>}
        </div>
      ))}
    </div>
  )
}

// ─── Micro helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gcd-field">
      <label className="gcd-label">{label}</label>
      {children}
    </div>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="gcd-field gcd-field-check">
      <label className="gcd-label">{label}</label>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="gcd-checkbox" />
    </div>
  )
}
