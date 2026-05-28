/**
 * Generic reusable graph components.
 *
 * All graphs are self-sizing (100% width/height of their container).
 * Feed them a `data` array and they handle the rest.
 *
 * Exports:
 *   LineGraph    — scrolling time-series line chart (multi-series)
 *   BarGraph     — vertical bar chart (categorical)
 *   Gauge        — circular arc gauge
 *   Sparkline    — minimal inline trend line (no axes/labels)
 *   HistoGraph   — horizontal histogram / distribution
 */

import { useEffect, useRef, CSSProperties } from 'react'
import './Graphs.css'

// ─── helpers ─────────────────────────────────────────────────────────────────

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function resolveColor(color: string): string {
  return color.startsWith('var(') ? cssVar(color.slice(4, -1)) : color
}

// ─── LineGraph ────────────────────────────────────────────────────────────────

export interface LineSeries {
  label: string
  data: number[]
  color: string
  /** Fill area under line */
  fill?: boolean
}

export interface LineGraphProps {
  series: LineSeries[]
  /** ms between samples — used only for x-axis label */
  sampleMs?: number
  showGrid?: boolean
  showAxes?: boolean
  showLegend?: boolean
  yMin?: number
  yMax?: number
  style?: CSSProperties
  className?: string
}

export function LineGraph({ series, showGrid = true, showAxes = true, showLegend = true, yMin, yMax, style, className = '' }: LineGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, W, H)

    const pad = { top: 8, right: 8, bottom: showAxes ? 24 : 6, left: showAxes ? 36 : 6 }
    const pw = W - pad.left - pad.right
    const ph = H - pad.top  - pad.bottom

    if (pw <= 0 || ph <= 0) return

    const allVals = series.flatMap(s => s.data)
    const dataMin = yMin ?? (allVals.length ? Math.min(...allVals) : 0)
    const dataMax = yMax ?? (allVals.length ? Math.max(...allVals) : 1)
    const range   = dataMax - dataMin || 1

    function toX(i: number, len: number) { return pad.left + (i / Math.max(len - 1, 1)) * pw }
    function toY(v: number)              { return pad.top  + ph - ((v - dataMin) / range) * ph }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = resolveColor('var(--border)') || 'rgba(128,128,128,0.2)'
      ctx.lineWidth = 0.5
      const gridLines = 4
      for (let i = 0; i <= gridLines; i++) {
        const y = pad.top + (i / gridLines) * ph
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke()
      }
    }

    // Axes labels
    if (showAxes) {
      ctx.fillStyle = resolveColor('var(--text-muted)') || '#888'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      const gridLines = 4
      for (let i = 0; i <= gridLines; i++) {
        const v = dataMin + (1 - i / gridLines) * range
        const y = pad.top + (i / gridLines) * ph
        ctx.fillText(v.toFixed(range < 2 ? 2 : 1), pad.left - 4, y + 3)
      }
    }

    // Series
    for (const s of series) {
      if (s.data.length < 2) continue
      const color = resolveColor(s.color)
      const pts = s.data.map((v, i) => [toX(i, s.data.length), toY(v)] as [number, number])

      if (s.fill) {
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pad.top + ph)
        pts.forEach(([x, y]) => ctx.lineTo(x, y))
        ctx.lineTo(pts[pts.length - 1][0], pad.top + ph)
        ctx.closePath()
        ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb(', 'rgba(').replace('#', '') + '26'
        // simpler:
        ctx.globalAlpha = 0.15
        ctx.fillStyle = color
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.lineCap  = 'round'
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
      ctx.stroke()

      // latest dot
      const [lx, ly] = pts[pts.length - 1]
      ctx.beginPath()
      ctx.arc(lx, ly, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }
  })

  return (
    <div className={`gc-graph-wrap ${className}`} style={style}>
      {showLegend && series.length > 0 && (
        <div className="gc-graph-legend">
          {series.map(s => (
            <span key={s.label} className="gc-legend-item">
              <span className="gc-legend-dot" style={{ background: s.color }} />
              {s.label}
              <span className="gc-legend-val">
                {s.data.length ? (s.data[s.data.length - 1]).toFixed(2) : '—'}
              </span>
            </span>
          ))}
        </div>
      )}
      <canvas ref={canvasRef} className="gc-canvas" />
    </div>
  )
}

// ─── BarGraph ─────────────────────────────────────────────────────────────────

export interface BarItem {
  label: string
  value: number
  color?: string
}

export interface BarGraphProps {
  items: BarItem[]
  max?: number
  showValues?: boolean
  barColor?: string
  style?: CSSProperties
  className?: string
}

export function BarGraph({ items, max, showValues = true, barColor = 'var(--accent)', style, className = '' }: BarGraphProps) {
  const dataMax = max ?? Math.max(...items.map(i => i.value), 1)

  return (
    <div className={`gc-bargraph ${className}`} style={style}>
      {items.map(item => {
        const pct = Math.max(0, Math.min(100, (item.value / dataMax) * 100))
        const color = item.color ?? barColor
        return (
          <div key={item.label} className="gc-bar-row">
            <span className="gc-bar-label">{item.label}</span>
            <div className="gc-bar-track">
              <div className="gc-bar-fill" style={{ width: `${pct}%`, background: resolveColor(color) }} />
            </div>
            {showValues && (
              <span className="gc-bar-value">{item.value.toFixed(item.value % 1 === 0 ? 0 : 2)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

export interface GaugeProps {
  value: number
  min?: number
  max?: number
  label?: string
  unit?: string
  color?: string
  /** 0–1 threshold to switch to warning color */
  warnAt?: number
  /** 0–1 threshold to switch to danger color */
  dangerAt?: number
  style?: CSSProperties
  className?: string
}

export function Gauge({ value, min = 0, max = 100, label, unit, color = 'var(--accent)', warnAt = 0.75, dangerAt = 0.9, style, className = '' }: GaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const size = Math.min(canvas.clientWidth, canvas.clientHeight)
    canvas.width  = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2, cy = size / 2
    const r  = size * 0.38
    const startAngle = Math.PI * 0.75
    const endAngle   = Math.PI * 2.25
    const fillAngle  = startAngle + pct * (endAngle - startAngle)

    ctx.clearRect(0, 0, size, size)

    // Background arc
    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = resolveColor('var(--border)') || '#333'
    ctx.lineWidth   = size * 0.1
    ctx.lineCap     = 'round'
    ctx.stroke()

    // Active arc
    const activeColor = pct >= dangerAt
      ? resolveColor('var(--error)')
      : pct >= warnAt
        ? resolveColor('var(--warning)')
        : resolveColor(color)

    if (pct > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillAngle)
      ctx.strokeStyle = activeColor
      ctx.lineWidth   = size * 0.1
      ctx.lineCap     = 'round'
      ctx.stroke()
    }

    // Value text
    ctx.fillStyle  = resolveColor('var(--text-primary)') || '#fff'
    ctx.font       = `bold ${size * 0.18}px monospace`
    ctx.textAlign  = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(value.toFixed(max <= 10 ? 1 : 0), cx, cy - size * 0.02)

    // Unit text
    if (unit) {
      ctx.fillStyle  = resolveColor('var(--text-muted)') || '#888'
      ctx.font       = `${size * 0.09}px sans-serif`
      ctx.fillText(unit, cx, cy + size * 0.15)
    }
  })

  return (
    <div className={`gc-gauge-wrap ${className}`} style={style}>
      <canvas ref={canvasRef} className="gc-gauge-canvas" />
      {label && <div className="gc-gauge-label">{label}</div>}
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

export interface SparklineProps {
  data: number[]
  color?: string
  fill?: boolean
  style?: CSSProperties
  className?: string
}

export function Sparkline({ data, color = 'var(--accent)', fill = false, style, className = '' }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth, H = canvas.clientHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const toX = (i: number) => (i / (data.length - 1)) * W
    const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2

    const c = resolveColor(color)
    const pts = data.map((v, i) => [toX(i), toY(v)] as [number, number])

    if (fill) {
      ctx.beginPath()
      ctx.moveTo(pts[0][0], H)
      pts.forEach(([x, y]) => ctx.lineTo(x, y))
      ctx.lineTo(pts[pts.length - 1][0], H)
      ctx.closePath()
      ctx.globalAlpha = 0.15
      ctx.fillStyle = c
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.beginPath()
    ctx.strokeStyle = c
    ctx.lineWidth   = 1.5
    ctx.lineJoin    = 'round'
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
    ctx.stroke()
  })

  return <canvas ref={canvasRef} className={`gc-sparkline ${className}`} style={style} />
}

// ─── HistoGraph ───────────────────────────────────────────────────────────────

export interface HistoGraphProps {
  /** Raw data array — component bins it automatically */
  data: number[]
  bins?: number
  color?: string
  showStats?: boolean
  style?: CSSProperties
  className?: string
}

export function HistoGraph({ data, bins = 20, color = 'var(--accent)', showStats = true, style, className = '' }: HistoGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const min   = data.length ? Math.min(...data) : 0
  const max   = data.length ? Math.max(...data) : 1
  const mean  = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const range = max - min || 1

  const counts = Array(bins).fill(0) as number[]
  data.forEach(v => {
    const b = Math.min(bins - 1, Math.floor(((v - min) / range) * bins))
    counts[b]++
  })
  const maxCount = Math.max(...counts, 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth, H = canvas.clientHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const c      = resolveColor(color)
    const barW   = W / bins
    const pad    = 2

    counts.forEach((cnt, i) => {
      const barH = (cnt / maxCount) * H
      ctx.fillStyle   = c
      ctx.globalAlpha = 0.7
      ctx.fillRect(i * barW + pad, H - barH, barW - pad * 2, barH)
      ctx.globalAlpha = 1
    })

    // Mean line
    const meanX = ((mean - min) / range) * W
    ctx.strokeStyle = resolveColor('var(--warning)') || '#fbbf24'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(meanX, 0); ctx.lineTo(meanX, H); ctx.stroke()
    ctx.setLineDash([])
  })

  return (
    <div className={`gc-histo-wrap ${className}`} style={style}>
      <canvas ref={canvasRef} className="gc-canvas" />
      {showStats && data.length > 0 && (
        <div className="gc-histo-stats">
          <span>min <b>{min.toFixed(2)}</b></span>
          <span>mean <b>{mean.toFixed(2)}</b></span>
          <span>max <b>{max.toFixed(2)}</b></span>
        </div>
      )}
    </div>
  )
}
