import { useState, useCallback } from 'react'
// Use the legacy API which includes WidthProvider + ResponsiveReactGridLayout
import { WidthProvider, ResponsiveReactGridLayout } from 'react-grid-layout/legacy'
import type { Layout, ResponsiveLayouts, LayoutItem } from 'react-grid-layout'
import { Header } from '@/components/layout/Header'
import { MotionControlWidget } from '@/components/widgets/MotionControlWidget'
import { CommandControlWidget } from '@/components/widgets/CommandControlWidget'
import { SensorDataWidget } from '@/components/widgets/SensorDataWidget'
import { VideoStreamWidget } from '@/components/widgets/VideoStreamWidget'
import { IMU3DWidget } from '@/components/widgets/IMU3DWidget'
import { DetectionPanelWidget } from '@/components/widgets/DetectionPanelWidget'
import { RobotMapWidget } from '@/components/widgets/RobotMapWidget'
import { DigitalTwinWidget } from '@/components/widgets/DigitalTwinWidget'
import './App.css'

// @ts-ignore — CSS module not typed
import 'react-grid-layout/css/styles.css'
// @ts-ignore
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(ResponsiveReactGridLayout)

type PanelId = 'motion' | 'command' | 'sensor' | 'video' | 'imu3d' | 'detection' | 'map' | 'twin'

const ALL_PANELS: { id: PanelId; label: string }[] = [
  { id: 'motion',    label: 'Motion Control' },
  { id: 'command',   label: 'Command Control' },
  { id: 'sensor',    label: 'Sensor Data' },
  { id: 'video',     label: 'Video Stream' },
  { id: 'imu3d',     label: 'IMU 3D' },
  { id: 'detection', label: 'Detection' },
  { id: 'map',       label: 'Robot Map' },
  { id: 'twin',      label: 'Digital Twin' },
]

// Default layout: 12-column grid
const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'motion',    x: 0,  y: 0,  w: 3, h: 9  },
    { i: 'sensor',    x: 0,  y: 9,  w: 3, h: 8  },
    { i: 'command',   x: 0,  y: 17, w: 3, h: 5  },
    { i: 'twin',      x: 0,  y: 22, w: 3, h: 12 },
    { i: 'video',     x: 3,  y: 0,  w: 6, h: 10 },
    { i: 'map',       x: 3,  y: 10, w: 6, h: 10 },
    { i: 'imu3d',     x: 9,  y: 0,  w: 3, h: 12 },
    { i: 'detection', x: 9,  y: 12, w: 3, h: 10 },
  ],
  md: [
    { i: 'motion',    x: 0,  y: 0,  w: 3, h: 9  },
    { i: 'sensor',    x: 0,  y: 9,  w: 3, h: 8  },
    { i: 'command',   x: 0,  y: 17, w: 3, h: 5  },
    { i: 'twin',      x: 0,  y: 22, w: 3, h: 12 },
    { i: 'video',     x: 3,  y: 0,  w: 5, h: 10 },
    { i: 'map',       x: 3,  y: 10, w: 5, h: 10 },
    { i: 'imu3d',     x: 8,  y: 0,  w: 2, h: 12 },
    { i: 'detection', x: 8,  y: 12, w: 2, h: 10 },
  ],
  sm: [
    { i: 'motion',    x: 0, y: 0,  w: 3, h: 9  },
    { i: 'video',     x: 3, y: 0,  w: 3, h: 10 },
    { i: 'sensor',    x: 0, y: 9,  w: 3, h: 8  },
    { i: 'imu3d',     x: 3, y: 10, w: 3, h: 12 },
    { i: 'command',   x: 0, y: 17, w: 3, h: 5  },
    { i: 'detection', x: 3, y: 22, w: 3, h: 10 },
    { i: 'map',       x: 0, y: 22, w: 3, h: 10 },
    { i: 'twin',      x: 0, y: 32, w: 6, h: 12 },
  ],
  xs: [
    { i: 'motion',    x: 0, y: 0,  w: 4, h: 9  },
    { i: 'video',     x: 0, y: 9,  w: 4, h: 10 },
    { i: 'sensor',    x: 0, y: 19, w: 4, h: 8  },
    { i: 'imu3d',     x: 0, y: 27, w: 4, h: 12 },
    { i: 'command',   x: 0, y: 39, w: 4, h: 5  },
    { i: 'detection', x: 0, y: 44, w: 4, h: 10 },
    { i: 'map',       x: 0, y: 54, w: 4, h: 10 },
    { i: 'twin',      x: 0, y: 64, w: 4, h: 12 },
  ],
}

const LAYOUT_KEY = 'orc-grid-layouts'
const VISIBLE_KEY = 'orc-visible-panels'

function loadLayouts(): ResponsiveLayouts | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    return raw ? JSON.parse(raw) as ResponsiveLayouts : null
  } catch { return null }
}

function loadVisible(): Set<PanelId> {
  try {
    const raw = localStorage.getItem(VISIBLE_KEY)
    if (raw) return new Set(JSON.parse(raw) as PanelId[])
  } catch { /* ignore */ }
  return new Set<PanelId>(['motion', 'sensor', 'video', 'imu3d', 'detection', 'map', 'twin'])
}

function PanelComponent({ id }: { id: PanelId }) {
  switch (id) {
    case 'motion':    return <MotionControlWidget />
    case 'command':   return <CommandControlWidget />
    case 'sensor':    return <SensorDataWidget />
    case 'video':     return <VideoStreamWidget />
    case 'imu3d':     return <IMU3DWidget />
    case 'detection': return <DetectionPanelWidget />
    case 'map':       return <RobotMapWidget />
    case 'twin':      return <DigitalTwinWidget />
  }
}

export function App() {
  const [visible, setVisible] = useState<Set<PanelId>>(loadVisible)
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => loadLayouts() ?? DEFAULT_LAYOUTS)

  function toggle(id: PanelId) {
    setVisible(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(VISIBLE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(allLayouts))
  }, [])

  function resetLayout() {
    localStorage.removeItem(LAYOUT_KEY)
    setLayouts(DEFAULT_LAYOUTS)
  }

  // Filter each breakpoint's layout to only include visible panels
  const activeLayouts: ResponsiveLayouts = {}
  for (const bp of Object.keys(layouts)) {
    activeLayouts[bp] = (layouts[bp] as LayoutItem[]).filter(
      (l: LayoutItem) => visible.has(l.i as PanelId)
    )
  }

  return (
    <div className="app-root">
      <Header />
      <div className="app-toolbar">
        <span className="toolbar-title">Panels</span>
        {ALL_PANELS.map(p => (
          <button
            key={p.id}
            className={`toolbar-chip ${visible.has(p.id) ? 'active' : ''}`}
            onClick={() => toggle(p.id)}
          >
            {p.label}
          </button>
        ))}
        <span className="toolbar-spacer" />
        <button className="toolbar-chip reset-btn" onClick={resetLayout} title="Reset layout to default">
          Reset Layout
        </button>
      </div>

      <main className="app-main">
        <ResponsiveGrid
          className="rgl-grid"
          layouts={activeLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={36}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
          draggableHandle=".panel-header"
          resizeHandles={['se', 's', 'e']}
          useCSSTransforms
        >
          {ALL_PANELS.filter(p => visible.has(p.id)).map(p => (
            <div key={p.id} className="rgl-item">
              <PanelComponent id={p.id} />
            </div>
          ))}
        </ResponsiveGrid>
      </main>
    </div>
  )
}
