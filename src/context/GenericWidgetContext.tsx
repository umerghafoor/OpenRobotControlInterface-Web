/**
 * Manages the registry of user-created generic widget instances.
 * Each instance has a type, a user-given name, and type-specific config.
 *
 * Widgets are stored in localStorage under "orc-generic-widgets".
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Widget types ─────────────────────────────────────────────────────────────

export type GenericWidgetType =
  | 'sliders'    // 1–4 named sliders that publish to a topic
  | 'buttons'    // grid of named action buttons
  | 'display'    // numeric value displays / status badges
  | 'graph'      // scrolling line graph (multi-series)
  | 'gauge'      // circular gauges (1–3)
  | 'group'      // container that embeds 2–4 other generic widget configs

// ─── Per-type config ──────────────────────────────────────────────────────────

export interface SliderDef {
  id: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  bipolar: boolean
}

export interface ButtonDef {
  id: string
  label: string
  variant: 'default' | 'primary' | 'danger' | 'success' | 'warning' | 'ghost'
  command: string   // string published to robot_command on press
  icon?: string
}

export interface DisplayDef {
  id: string
  label: string
  unit: string
  rosKey: string    // key into the topic map — the widget calls useROS2Topic(rosKey)
  showBar: boolean
  barMin: number
  barMax: number
  color: string     // CSS color string
  size: 'sm' | 'md' | 'lg'
}

export interface GraphSeriesDef {
  id: string
  label: string
  rosKey: string
  color: string
  fill: boolean
}

export interface GaugeDef {
  id: string
  label: string
  unit: string
  rosKey: string
  min: number
  max: number
  warnAt: number
  dangerAt: number
  color: string
}

export interface GroupSlotDef {
  widgetId: string   // references another GenericWidget.id
}

// ─── Top-level instance ───────────────────────────────────────────────────────

export interface GenericWidget {
  id: string
  type: GenericWidgetType
  name: string
  icon: string   // IconName string

  // Type-specific config — only the relevant one is populated
  sliders?:  { defs: SliderDef[] }
  buttons?:  { defs: ButtonDef[]; columns: 1 | 2 | 3 }
  displays?: { defs: DisplayDef[]; columns: 1 | 2 }
  graph?:    { series: GraphSeriesDef[]; showGrid: boolean; showAxes: boolean; historyLen: number }
  gauges?:   { defs: GaugeDef[]; columns: 1 | 2 | 3 }
  group?:    { slots: GroupSlotDef[]; layout: 'stack' | 'grid' }
}

// ─── Defaults for each type ───────────────────────────────────────────────────

export function defaultWidget(type: GenericWidgetType, id: string): GenericWidget {
  const base = { id, type, name: nameFor(type), icon: iconFor(type) }
  switch (type) {
    case 'sliders':
      return { ...base, sliders: { defs: [{ id: 'sl1', label: 'Value', min: 0, max: 1, step: 0.01, unit: '', bipolar: false }] } }
    case 'buttons':
      return { ...base, buttons: { defs: [{ id: 'b1', label: 'Send', variant: 'primary', command: 'CMD' }], columns: 2 } }
    case 'display':
      return { ...base, displays: { defs: [{ id: 'd1', label: 'Value', unit: '', rosKey: 'robotStatus', showBar: false, barMin: 0, barMax: 100, color: '', size: 'md' }], columns: 1 } }
    case 'graph':
      return { ...base, graph: { series: [{ id: 's1', label: 'Chan A', rosKey: 'imuData', color: 'var(--accent)', fill: true }], showGrid: true, showAxes: true, historyLen: 100 } }
    case 'gauge':
      return { ...base, gauges: { defs: [{ id: 'g1', label: 'Value', unit: '%', rosKey: 'robotStatus', min: 0, max: 100, warnAt: 0.75, dangerAt: 0.9, color: 'var(--accent)' }], columns: 1 } }
    case 'group':
      return { ...base, group: { slots: [], layout: 'stack' } }
  }
}

function nameFor(t: GenericWidgetType): string {
  return { sliders: 'Sliders', buttons: 'Buttons', display: 'Display', graph: 'Graph', gauge: 'Gauge', group: 'Group' }[t]
}

function iconFor(t: GenericWidgetType): string {
  return { sliders: 'signal', buttons: 'bolt', display: 'eye', graph: 'signal', gauge: 'compass', group: 'layout' }[t]
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface GenericWidgetContextValue {
  widgets: GenericWidget[]
  addWidget:    (type: GenericWidgetType) => GenericWidget
  updateWidget: (id: string, patch: Partial<GenericWidget>) => void
  removeWidget: (id: string) => void
  getWidget:    (id: string) => GenericWidget | undefined
}

const Ctx = createContext<GenericWidgetContextValue | null>(null)

const STORAGE_KEY = 'orc-generic-widgets'

function load(): GenericWidget[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}

function save(ws: GenericWidget[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ws)) } catch { /* noop */ }
}

export function GenericWidgetProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<GenericWidget[]>(load)

  const update = useCallback((next: GenericWidget[]) => { setWidgets(next); save(next) }, [])

  const addWidget = useCallback((type: GenericWidgetType): GenericWidget => {
    const id = `gw-${Date.now()}`
    const w  = defaultWidget(type, id)
    update([...widgets, w])
    return w
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, update])

  const updateWidget = useCallback((id: string, patch: Partial<GenericWidget>) => {
    update(widgets.map(w => w.id === id ? { ...w, ...patch } : w))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, update])

  const removeWidget = useCallback((id: string) => {
    update(widgets.filter(w => w.id !== id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, update])

  const getWidget = useCallback((id: string) => widgets.find(w => w.id === id), [widgets])

  return (
    <Ctx.Provider value={{ widgets, addWidget, updateWidget, removeWidget, getWidget }}>
      {children}
    </Ctx.Provider>
  )
}

export function useGenericWidgets() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGenericWidgets must be inside GenericWidgetProvider')
  return v
}
