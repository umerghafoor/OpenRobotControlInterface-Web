import { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useContainerSize, sizeClasses } from '@/hooks/useContainerSize'
import './PanelGrid.css'

interface PanelProps {
  title: string
  icon?: IconName
  children: ReactNode
  className?: string
  headerExtra?: ReactNode
  /** Replaces the entire title span with custom content (e.g. editable input) */
  titleNode?: ReactNode
}

export function Panel({ title, icon, children, className = '', headerExtra, titleNode }: PanelProps) {
  const { ref, size } = useContainerSize<HTMLDivElement>()
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        {titleNode ?? (
          <span className="panel-header-title">
            {icon && <Icon name={icon} size={14} className="panel-header-icon" />}
            {title}
          </span>
        )}
        {headerExtra && <div className="panel-header-extra">{headerExtra}</div>}
      </div>
      <div ref={ref} className={`panel-body ${sizeClasses(size)}`}>{children}</div>
    </div>
  )
}

export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="panel-grid">{children}</div>
}

export function PanelRow({ children }: { children: ReactNode }) {
  return <div className="panel-row">{children}</div>
}
