/**
 * Renders a GenericWidget instance by ID.
 * Looks up the widget config from GenericWidgetContext and renders the appropriate type.
 *
 * Usage:
 *   <GenericWidgetRenderer id="gw-123456" />
 */

import { useState, useRef, useEffect } from 'react'
import { useGenericWidgets } from '@/context/GenericWidgetContext'
import type { GenericWidget, SliderDef, ButtonDef, DisplayDef, GraphSeriesDef, GaugeDef } from '@/context/GenericWidgetContext'
import { GenericWidgetShell } from './GenericWidgetShell'
import { GenericConfigDrawer } from './GenericConfigDrawer'
import { Slider, ActionButton, ValueDisplay } from '@/components/ui/Controls'
import { LineGraph, Gauge } from '@/components/ui/Graphs'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import './GenericWidgetRenderer.css'

interface Props { id: string }

export function GenericWidgetRenderer({ id }: Props) {
  const { getWidget, updateWidget, removeWidget } = useGenericWidgets()
  const [configOpen, setConfigOpen] = useState(false)
  const widget = getWidget(id)

  if (!widget) return (
    <div className="gwr-missing">
      Widget <code>{id}</code> not found
    </div>
  )

  function rename(name: string) { updateWidget(id, { name }) }

  return (
    <>
      <GenericWidgetShell widget={widget} onRename={rename} onOpenConfig={() => setConfigOpen(true)}>
        <WidgetBody widget={widget} />
      </GenericWidgetShell>

      {configOpen && (
        <GenericConfigDrawer
          widget={widget}
          onClose={() => setConfigOpen(false)}
          onSave={patch => updateWidget(id, patch)}
          onDelete={() => { removeWidget(id); setConfigOpen(false) }}
        />
      )}
    </>
  )
}

// ─── Body router ─────────────────────────────────────────────────────────────

function WidgetBody({ widget }: { widget: GenericWidget }) {
  switch (widget.type) {
    case 'sliders':  return <SlidersBody widget={widget} />
    case 'buttons':  return <ButtonsBody widget={widget} />
    case 'display':  return <DisplayBody widget={widget} />
    case 'graph':    return <GraphBody   widget={widget} />
    case 'gauge':    return <GaugeBody   widget={widget} />
    case 'group':    return <GroupBody   widget={widget} />
    default:         return null
  }
}

// ─── Sliders ──────────────────────────────────────────────────────────────────

function SlidersBody({ widget }: { widget: GenericWidget }) {
  const defs = widget.sliders?.defs ?? []
  const vals = useRef<Record<string, number>>(Object.fromEntries(defs.map(d => [d.id, (d.min + d.max) / 2])))
  const [snap, setSnap] = useState({ ...vals.current })

  function onChange(id: string, v: number) {
    vals.current[id] = v
    setSnap({ ...vals.current })
  }

  return (
    <div className="gwr-sliders">
      {defs.map(d => (
        <Slider
          key={d.id}
          label={d.label}
          value={snap[d.id] ?? (d.min + d.max) / 2}
          min={d.min} max={d.max} step={d.step}
          unit={d.unit || undefined}
          bipolar={d.bipolar}
          onChange={v => onChange(d.id, v)}
        />
      ))}
    </div>
  )
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function ButtonsBody({ widget }: { widget: GenericWidget }) {
  const defs    = widget.buttons?.defs    ?? []
  const columns = widget.buttons?.columns ?? 2

  function send(cmd: string) {
    ros2Bridge.publishRobotCommand(cmd)
  }

  return (
    <div className="gwr-buttons" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {defs.map(d => (
        <ActionButton
          key={d.id}
          label={d.label}
          variant={d.variant}
          icon={d.icon as any}
          onClick={() => send(d.command)}
          fullWidth
        />
      ))}
    </div>
  )
}

// ─── Display ──────────────────────────────────────────────────────────────────

function DisplayBody({ widget }: { widget: GenericWidget }) {
  const defs    = widget.displays?.defs    ?? []
  const columns = widget.displays?.columns ?? 1

  return (
    <div className="gwr-display" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {defs.map(d => (
        <LiveValueDisplay key={d.id} def={d} />
      ))}
    </div>
  )
}

function LiveValueDisplay({ def }: { def: DisplayDef }) {
  const [val, setVal] = useState<number | string>(0)

  useEffect(() => {
    function onData(data: unknown) {
      if (typeof data === 'number') setVal(data)
      else if (typeof data === 'string') setVal(data)
      else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        const first = Object.values(obj)[0]
        if (typeof first === 'number') setVal(first)
        else setVal(JSON.stringify(data).slice(0, 30))
      }
    }
    ros2Bridge.on(def.rosKey as any, onData)
    return () => ros2Bridge.off(def.rosKey as any, onData)
  }, [def.rosKey])

  const numVal = typeof val === 'number' ? val : NaN
  const barPct = def.showBar && !isNaN(numVal)
    ? ((numVal - def.barMin) / (def.barMax - def.barMin)) * 100
    : undefined

  return (
    <ValueDisplay
      label={def.label}
      value={val}
      unit={def.unit || undefined}
      color={def.color || undefined}
      barPct={barPct}
      size={def.size}
    />
  )
}

// ─── Graph ────────────────────────────────────────────────────────────────────

function GraphBody({ widget }: { widget: GenericWidget }) {
  const cfg    = widget.graph!
  const maxLen = cfg.historyLen
  const bufs   = useRef<Record<string, number[]>>(Object.fromEntries(cfg.series.map(s => [s.id, []])))
  const [snap, setSnap] = useState(bufs.current)

  useEffect(() => {
    const handlers: Array<[string, (data: unknown) => void]> = cfg.series.map(s => {
      function onData(data: unknown) {
        const v = typeof data === 'number' ? data
          : typeof data === 'object' && data ? Object.values(data as object)[0] as number
          : 0
        const buf = bufs.current[s.id]
        if (!buf) return
        buf.push(v)
        if (buf.length > maxLen) buf.shift()
        setSnap({ ...bufs.current })
      }
      ros2Bridge.on(s.rosKey as any, onData)
      return [s.rosKey, onData]
    })
    return () => handlers.forEach(([key, fn]) => ros2Bridge.off(key as any, fn))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.series.map(s => s.rosKey).join(','), maxLen])

  const series = cfg.series.map(s => ({
    label: s.label,
    data:  snap[s.id] ?? [],
    color: s.color,
    fill:  s.fill,
  }))

  return (
    <div className="gwr-graph">
      <LineGraph series={series} showGrid={cfg.showGrid} showAxes={cfg.showAxes} showLegend />
    </div>
  )
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

function GaugeBody({ widget }: { widget: GenericWidget }) {
  const defs    = widget.gauges?.defs    ?? []
  const columns = widget.gauges?.columns ?? 1

  return (
    <div className="gwr-gauges" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {defs.map(d => <LiveGauge key={d.id} def={d} />)}
    </div>
  )
}

function LiveGauge({ def }: { def: GaugeDef }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    function onData(data: unknown) {
      const v = typeof data === 'number' ? data
        : typeof data === 'object' && data ? Object.values(data as object)[0] as number
        : 0
      setVal(v)
    }
    ros2Bridge.on(def.rosKey as any, onData)
    return () => ros2Bridge.off(def.rosKey as any, onData)
  }, [def.rosKey])

  return (
    <Gauge
      value={val}
      min={def.min} max={def.max}
      label={def.label} unit={def.unit}
      color={def.color}
      warnAt={def.warnAt} dangerAt={def.dangerAt}
    />
  )
}

// ─── Group ────────────────────────────────────────────────────────────────────

function GroupBody({ widget }: { widget: GenericWidget }) {
  const { getWidget } = useGenericWidgets()
  const slots  = widget.group?.slots  ?? []
  const layout = widget.group?.layout ?? 'stack'

  if (slots.length === 0) return (
    <div className="gwr-group-empty">No widgets added. Configure to add slots.</div>
  )

  return (
    <div className={`gwr-group gwr-group-${layout}`}>
      {slots.map((slot, i) => {
        const child = getWidget(slot.widgetId)
        if (!child) return <div key={i} className="gwr-group-missing">Missing: {slot.widgetId}</div>
        return (
          <div key={i} className="gwr-group-slot">
            <WidgetBody widget={child} />
          </div>
        )
      })}
    </div>
  )
}
