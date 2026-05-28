import { ReactNode } from 'react'
import './PanelGrid.css'

interface PanelProps {
  title: string
  children: ReactNode
  className?: string
  headerExtra?: ReactNode
}

export function Panel({ title, children, className = '', headerExtra }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span>{title}</span>
        {headerExtra && <div className="panel-header-extra">{headerExtra}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="panel-grid">{children}</div>
}

export function PanelRow({ children }: { children: ReactNode }) {
  return <div className="panel-row">{children}</div>
}
