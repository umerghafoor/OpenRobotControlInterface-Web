/**
 * Floating "Add Widget" button + dropdown menu in the header.
 * Creates a new generic widget and adds it to the grid.
 */

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { GenericWidgetType } from '@/context/GenericWidgetContext'
import './AddWidgetMenu.css'

const WIDGET_OPTIONS: { type: GenericWidgetType; label: string; desc: string; icon: string }[] = [
  { type: 'sliders',  label: 'Sliders',  desc: '1–4 named sliders',                icon: 'signal'   },
  { type: 'buttons',  label: 'Buttons',  desc: 'Named command buttons',             icon: 'bolt'     },
  { type: 'display',  label: 'Display',  desc: 'Live value readouts',               icon: 'eye'      },
  { type: 'graph',    label: 'Graph',    desc: 'Scrolling multi-series line graph', icon: 'signal'   },
  { type: 'gauge',    label: 'Gauge',    desc: '1–3 circular gauges',               icon: 'compass'  },
  { type: 'group',    label: 'Group',    desc: 'Combine 2–4 widgets in one panel',  icon: 'layout'   },
]

interface Props {
  onAdd: (type: GenericWidgetType) => void
}

export function AddWidgetMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(type: GenericWidgetType) {
    onAdd(type)
    setOpen(false)
  }

  return (
    <div className="awm-wrap" ref={menuRef}>
      <button
        className={`awm-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Add generic widget"
      >
        <Icon name="layout" size={13} />
        <span className="awm-label">Add Widget</span>
        <Icon name="chevron-down" size={11} className={`awm-caret ${open ? 'flipped' : ''}`} />
      </button>

      {open && (
        <div className="awm-menu">
          <div className="awm-menu-header">Add a widget to the grid</div>
          {WIDGET_OPTIONS.map(opt => (
            <button key={opt.type} className="awm-item" onClick={() => pick(opt.type)}>
              <div className="awm-item-icon"><Icon name={opt.icon as any} size={15} /></div>
              <div className="awm-item-text">
                <span className="awm-item-label">{opt.label}</span>
                <span className="awm-item-desc">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
