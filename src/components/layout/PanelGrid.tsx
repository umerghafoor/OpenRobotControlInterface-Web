import { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import './PanelGrid.css'

interface PanelProps {
  title: string
  icon?: IconName
  children: ReactNode
  className?: string
  headerExtra?: ReactNode
}

export function Panel({ title, icon, children, className = '', headerExtra }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span className="panel-header-title">
          {icon && <Icon name={icon} size={14} className="panel-header-icon" />}
          {title}
        </span>
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
