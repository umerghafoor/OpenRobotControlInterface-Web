/**
 * Thin wrapper used by all generic widgets.
 * - Double-click the panel title to rename in-place.
 * - Gear button opens the config drawer.
 */

import { useState, useRef, useEffect, ReactNode } from 'react'
import { Panel } from '@/components/layout/PanelGrid'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { GenericWidget } from '@/context/GenericWidgetContext'
import './GenericWidgetShell.css'

interface ShellProps {
  widget: GenericWidget
  onRename:     (name: string) => void
  onOpenConfig: () => void
  children:     ReactNode
  headerExtra?: ReactNode
}

export function GenericWidgetShell({ widget, onRename, onOpenConfig, children, headerExtra }: ShellProps) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(widget.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])
  useEffect(() => { setDraft(widget.name) }, [widget.name])

  function commit() {
    setEditing(false)
    const t = draft.trim()
    if (t && t !== widget.name) onRename(t)
    else setDraft(widget.name)
  }

  const titleNode = editing ? (
    <input
      ref={inputRef}
      className="gws-title-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter')  { commit() }
        if (e.key === 'Escape') { setEditing(false); setDraft(widget.name) }
        e.stopPropagation()
      }}
      onClick={e => e.stopPropagation()}
    />
  ) : (
    <span className="panel-header-title gws-title" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
      <Icon name={widget.icon as IconName} size={14} className="panel-header-icon" />
      {widget.name}
      <Icon name="refresh" size={9} className="gws-edit-hint" />
    </span>
  )

  const extra = (
    <div className="gws-header-extras">
      {headerExtra}
      <button
        className="gws-config-btn"
        title="Configure widget"
        onClick={e => { e.stopPropagation(); onOpenConfig() }}
      >
        <Icon name="gear" size={13} />
      </button>
    </div>
  )

  return (
    <Panel title={widget.name} titleNode={titleNode} headerExtra={extra}>
      {children}
    </Panel>
  )
}
