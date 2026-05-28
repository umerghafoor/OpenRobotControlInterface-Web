/**
 * Generic reusable control primitives.
 *
 * Import what you need:
 *   import { Slider, ActionButton, Toggle, ValueDisplay, ButtonGroup,
 *            StatusBadge, LabeledSection, NumberInput, TextCommand } from '@/components/ui/Controls'
 */

import { useState, ReactNode, CSSProperties } from 'react'
import { Icon, type IconName } from './Icon'
import './Controls.css'

// ─── Slider ──────────────────────────────────────────────────────────────────

export interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (v: number) => void
  /** Fills from centre outward for −/+ ranges */
  bipolar?: boolean
}

export function Slider({ label, value, min = 0, max = 1, step = 0.01, unit, disabled, onChange, bipolar }: SliderProps) {
  const pct    = ((value - min) / (max - min)) * 100
  const zeroPct = bipolar ? ((-min) / (max - min)) * 100 : 0

  return (
    <div className={`gc-slider-wrap ${disabled ? 'gc-disabled' : ''}`}>
      <div className="gc-slider-header">
        <span className="gc-label">{label}</span>
        <span className="gc-value">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          {unit && <span className="gc-unit"> {unit}</span>}
        </span>
      </div>
      <div className="gc-slider-track-wrap">
        <div className="gc-slider-track">
          <div
            className="gc-slider-fill"
            style={bipolar
              ? { left: `${Math.min(zeroPct, pct)}%`, width: `${Math.abs(pct - zeroPct)}%` }
              : { width: `${pct}%` }
            }
          />
          {bipolar && <div className="gc-slider-zero" style={{ left: `${zeroPct}%` }} />}
        </div>
        <input
          type="range"
          className="gc-range"
          min={min} max={max} step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(+e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'success' | 'warning' | 'ghost'

export interface ActionButtonProps {
  label: string
  onClick: () => void
  variant?: ButtonVariant
  icon?: IconName
  disabled?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ActionButton({ label, onClick, variant = 'default', icon, disabled, fullWidth, size = 'md' }: ActionButtonProps) {
  return (
    <button
      className={`gc-btn gc-btn-${variant} gc-btn-${size} ${fullWidth ? 'gc-full' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />}
      {label}
    </button>
  )
}

// ─── ButtonGroup ─────────────────────────────────────────────────────────────

export interface ButtonGroupOption<T extends string = string> {
  value: T
  label: string
  icon?: IconName
}

export interface ButtonGroupProps<T extends string = string> {
  label?: string
  options: ButtonGroupOption<T>[]
  value: T
  onChange: (v: T) => void
  variant?: 'segment' | 'pills'
}

export function ButtonGroup<T extends string>({ label, options, value, onChange, variant = 'segment' }: ButtonGroupProps<T>) {
  return (
    <div className="gc-btn-group-wrap">
      {label && <span className="gc-label">{label}</span>}
      <div className={`gc-btn-group gc-btn-group-${variant}`}>
        {options.map(opt => (
          <button
            key={opt.value}
            className={`gc-btn-group-item ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <Icon name={opt.icon} size={13} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className={`gc-toggle-row ${disabled ? 'gc-disabled' : ''}`} onClick={() => !disabled && onChange(!checked)}>
      <div className="gc-toggle-info">
        <span className="gc-toggle-label">{label}</span>
        {description && <span className="gc-toggle-desc">{description}</span>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`gc-toggle ${checked ? 'on' : ''}`}
        onClick={e => { e.stopPropagation(); !disabled && onChange(!checked) }}
        disabled={disabled}
      >
        <span className="gc-toggle-thumb" />
      </button>
    </div>
  )
}

// ─── ValueDisplay ─────────────────────────────────────────────────────────────

export interface ValueDisplayProps {
  label: string
  value: number | string
  unit?: string
  color?: string
  barPct?: number
  barColor?: string
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
}

export function ValueDisplay({ label, value, unit, color, barPct, barColor, size = 'md', icon }: ValueDisplayProps) {
  return (
    <div className={`gc-value-display gc-vd-${size}`} style={{ '--vd-color': color } as CSSProperties}>
      <div className="gc-vd-label-row">
        {icon && <Icon name={icon} size={11} />}
        <span className="gc-vd-label">{label}</span>
      </div>
      <div className="gc-vd-value">
        {typeof value === 'number' ? value.toFixed(3) : value}
        {unit && <span className="gc-vd-unit">{unit}</span>}
      </div>
      {barPct !== undefined && (
        <div className="gc-vd-bar-track">
          <div
            className="gc-vd-bar-fill"
            style={{ width: `${Math.max(0, Math.min(100, barPct))}%`, background: barColor ?? 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'green' | 'blue' | 'yellow' | 'red' | 'purple'

export interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: boolean
  pulse?: boolean
}

export function StatusBadge({ label, variant = 'default', dot, pulse }: StatusBadgeProps) {
  return (
    <span className={`gc-badge gc-badge-${variant}`}>
      {dot && <span className={`gc-badge-dot ${pulse ? 'gc-pulse' : ''}`} />}
      {label}
    </span>
  )
}

// ─── LabeledSection ──────────────────────────────────────────────────────────

export interface LabeledSectionProps {
  title: string
  children: ReactNode
  icon?: IconName
}

export function LabeledSection({ title, children, icon }: LabeledSectionProps) {
  return (
    <div className="gc-section">
      <div className="gc-section-header">
        {icon && <Icon name={icon} size={12} />}
        <span className="gc-section-title">{title}</span>
      </div>
      <div className="gc-section-body">{children}</div>
    </div>
  )
}

// ─── NumberInput ─────────────────────────────────────────────────────────────

export interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (v: number) => void
}

export function NumberInput({ label, value, min, max, step = 1, unit, disabled, onChange }: NumberInputProps) {
  function clamp(v: number) {
    if (min !== undefined && v < min) return min
    if (max !== undefined && v > max) return max
    return v
  }
  return (
    <div className={`gc-number-input ${disabled ? 'gc-disabled' : ''}`}>
      <span className="gc-label">{label}</span>
      <div className="gc-number-row">
        <button className="gc-num-btn" onClick={() => onChange(clamp(value - step))} disabled={disabled}>−</button>
        <input
          type="number"
          className="gc-num-field"
          value={value}
          min={min} max={max} step={step}
          disabled={disabled}
          onChange={e => onChange(clamp(+e.target.value))}
        />
        {unit && <span className="gc-num-unit">{unit}</span>}
        <button className="gc-num-btn" onClick={() => onChange(clamp(value + step))} disabled={disabled}>+</button>
      </div>
    </div>
  )
}

// ─── TextCommand ─────────────────────────────────────────────────────────────

export interface TextCommandProps {
  label?: string
  placeholder?: string
  onSend: (text: string) => void
  disabled?: boolean
  history?: string[]
}

export function TextCommand({ label, placeholder = 'Enter command…', onSend, disabled, history }: TextCommandProps) {
  const [val, setVal] = useState('')

  function send() {
    if (!val.trim() || disabled) return
    onSend(val.trim())
    setVal('')
  }

  return (
    <div className={`gc-text-command ${disabled ? 'gc-disabled' : ''}`}>
      {label && <span className="gc-label">{label}</span>}
      <div className="gc-text-row">
        <input
          list={history?.length ? 'gc-cmd-history' : undefined}
          className="gc-text-input"
          value={val}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        {history?.length && (
          <datalist id="gc-cmd-history">
            {history.map(h => <option key={h} value={h} />)}
          </datalist>
        )}
        <button className="gc-btn gc-btn-primary gc-btn-sm" onClick={send} disabled={disabled || !val.trim()}>
          <Icon name="bolt" size={12} />Send
        </button>
      </div>
    </div>
  )
}
