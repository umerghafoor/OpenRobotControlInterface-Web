import { useState, useCallback, useEffect } from 'react'
import { WidthProvider, ResponsiveReactGridLayout } from 'react-grid-layout/legacy'
import type { Layout, ResponsiveLayouts, LayoutItem } from 'react-grid-layout'
import { Header, type PanelId } from '@/components/layout/Header'
import { SettingsPanel } from '@/components/layout/SettingsPanel'
import { AddWidgetMenu } from '@/components/layout/AddWidgetMenu'
import { MotionControlWidget } from '@/components/widgets/MotionControlWidget'
import { CommandControlWidget } from '@/components/widgets/CommandControlWidget'
import { SensorDataWidget } from '@/components/widgets/SensorDataWidget'
import { VideoStreamWidget } from '@/components/widgets/VideoStreamWidget'
import { IMU3DWidget } from '@/components/widgets/IMU3DWidget'
import { DetectionPanelWidget } from '@/components/widgets/DetectionPanelWidget'
import { RobotMapWidget } from '@/components/widgets/RobotMapWidget'
import { DigitalTwinWidget } from '@/components/widgets/DigitalTwinWidget'
import { GenericWidgetRenderer } from '@/components/widgets/generic/GenericWidgetRenderer'
import { useSettings } from '@/context/SettingsContext'
import { useGenericWidgets, type GenericWidgetType } from '@/context/GenericWidgetContext'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import './App.css'

// @ts-ignore
import 'react-grid-layout/css/styles.css'
// @ts-ignore
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(ResponsiveReactGridLayout)

const STATIC_PANELS: PanelId[] = ['motion', 'command', 'sensor', 'video', 'imu3d', 'detection', 'map', 'twin']

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

const LAYOUT_KEY  = 'orc-grid-layouts'
const VISIBLE_KEY = 'orc-visible-panels'
const GW_LAYOUT_KEY = 'orc-gw-layouts'

function loadLayouts(): ResponsiveLayouts | null {
  try { const r = localStorage.getItem(LAYOUT_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

function loadVisible(): Set<PanelId> {
  try {
    const r = localStorage.getItem(VISIBLE_KEY)
    if (r) return new Set(JSON.parse(r) as PanelId[])
  } catch { /* ignore */ }
  return new Set<PanelId>(['motion', 'sensor', 'video', 'imu3d', 'detection', 'map', 'twin'])
}

function loadGwLayouts(): Record<string, { x: number; y: number; w: number; h: number }> {
  try { const r = localStorage.getItem(GW_LAYOUT_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}

function StaticPanel({ id }: { id: PanelId }) {
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
  const [visible, setVisible]   = useState<Set<PanelId>>(loadVisible)
  const [layouts, setLayouts]   = useState<ResponsiveLayouts>(() => loadLayouts() ?? DEFAULT_LAYOUTS)
  const [gwLayouts, setGwLayouts] = useState(loadGwLayouts)
  const { settings } = useSettings()
  const { widgets, addWidget, removeWidget } = useGenericWidgets()

  useEffect(() => {
    ros2Bridge.applyTopicMap(settings.topicMap)
  }, [settings.topicMap])

  function togglePanel(id: PanelId) {
    setVisible(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(VISIBLE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: ResponsiveLayouts) => {
    const staticLayouts: ResponsiveLayouts = {}
    const gwPos: Record<string, { x: number; y: number; w: number; h: number }> = {}

    for (const bp of Object.keys(allLayouts)) {
      const bpItems: LayoutItem[] = []
      for (const item of allLayouts[bp] as LayoutItem[]) {
        if (item.i.startsWith('gw-')) {
          if (bp === 'lg') gwPos[item.i] = { x: item.x, y: item.y, w: item.w, h: item.h }
        } else {
          bpItems.push(item)
        }
      }
      staticLayouts[bp] = bpItems
    }
    setLayouts(staticLayouts)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(staticLayouts))
    if (Object.keys(gwPos).length) {
      setGwLayouts(prev => {
        const next = { ...prev, ...gwPos }
        localStorage.setItem(GW_LAYOUT_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [])

  function resetLayout() {
    localStorage.removeItem(LAYOUT_KEY)
    setLayouts(DEFAULT_LAYOUTS)
  }

  function handleAddWidget(type: GenericWidgetType) {
    const w = addWidget(type)
    // Give it an initial position — top-right area
    setGwLayouts(prev => {
      const next = { ...prev, [w.id]: { x: 9, y: 0, w: 3, h: 8 } }
      localStorage.setItem(GW_LAYOUT_KEY, JSON.stringify(next))
      return next
    })
  }

  // Build the combined layouts for the grid
  const combinedLayouts: ResponsiveLayouts = {}
  for (const bp of ['lg', 'md', 'sm', 'xs', 'xxs']) {
    const staticItems = ((layouts[bp] ?? DEFAULT_LAYOUTS['lg'] ?? []) as LayoutItem[])
      .filter(l => visible.has(l.i as PanelId))

    const gwItems: LayoutItem[] = widgets.map(w => {
      const pos = gwLayouts[w.id] ?? { x: 9, y: 0, w: 3, h: 8 }
      return { i: w.id, ...pos }
    })

    combinedLayouts[bp] = [...staticItems, ...gwItems]
  }

  return (
    <div className="app-root">
      <Header
        visible={visible}
        onTogglePanel={togglePanel}
        onResetLayout={resetLayout}
        addWidgetSlot={<AddWidgetMenu onAdd={handleAddWidget} />}
      />
      <SettingsPanel />
      <main className="app-main">
        <ResponsiveGrid
          className="rgl-grid"
          layouts={combinedLayouts}
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
          {STATIC_PANELS.filter(p => visible.has(p)).map(p => (
            <div key={p} className="rgl-item">
              <StaticPanel id={p} />
            </div>
          ))}
          {widgets.map(w => (
            <div key={w.id} className="rgl-item">
              <GenericWidgetRenderer id={w.id} />
            </div>
          ))}
        </ResponsiveGrid>
      </main>
    </div>
  )
}
