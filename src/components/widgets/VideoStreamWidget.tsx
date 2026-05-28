import { useState, useEffect, useRef, useCallback } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './VideoStreamWidget.css'

const TOPICS = [
  { label: 'Color JPEG', topic: '/camera/color_jpeg' },
  { label: 'Raw', topic: 'camera/raw' },
  { label: 'Detection', topic: '/camera/detection' },
  { label: 'Depth', topic: '/camera/depth' },
]

const STALE_MS = 3000

export function VideoStreamWidget() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [resolution, setResolution] = useState('')
  const [stale, setStale] = useState(true)
  const [recording, setRecording] = useState(false)

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const fpsFrames = useRef<number[]>([])
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const activeTopic = TOPICS[activeIdx].topic

  const onFrame = useCallback(({ topic, data }: { topic: string; data: string; width: number; height: number }) => {
    if (topic !== activeTopic) return
    const src = `data:image/jpeg;base64,${data}`
    setImgSrc(src)
    setStale(false)

    const now = Date.now()
    fpsFrames.current.push(now)
    const cutoff = now - 1000
    fpsFrames.current = fpsFrames.current.filter(t => t > cutoff)
    setFps(fpsFrames.current.length)

    clearTimeout(staleTimer.current!)
    staleTimer.current = setTimeout(() => setStale(true), STALE_MS)
  }, [activeTopic])

  useEffect(() => {
    ros2Bridge.on('imageFrame', onFrame)
    ros2Bridge.subscribeCameraTopic(activeTopic)
    return () => {
      ros2Bridge.off('imageFrame', onFrame)
      ros2Bridge.unsubscribeCameraTopic(activeTopic)
    }
  }, [activeTopic, onFrame])

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setResolution(`${img.naturalWidth}×${img.naturalHeight}`)
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setOffset({
      x: dragRef.current.ox + e.clientX - dragRef.current.startX,
      y: dragRef.current.oy + e.clientY - dragRef.current.startY,
    })
  }

  function onPointerUp() { dragRef.current = null }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.max(0.1, Math.min(10, z - e.deltaY * 0.001)))
  }

  function resetView() { setZoom(1); setOffset({ x: 0, y: 0 }) }

  return (
    <Panel
      title="Video Stream"
      icon="camera"
      headerExtra={
        <div className="stream-header-actions">
          <span className={`live-dot ${stale ? 'stale' : 'live'}`} />
          {!stale && <span className="fps-badge">{fps} fps</span>}
          {resolution && <span className="res-badge">{resolution}</span>}
          <button
            className={`btn btn-sm ${recording ? 'btn-danger' : ''}`}
            onClick={() => setRecording(v => !v)}
          >
            {recording ? '■ Stop' : '● REC'}
          </button>
        </div>
      }
    >
      <div className="stream-widget">
        <div className="stream-tabs">
          {TOPICS.map((t, i) => (
            <button
              key={t.topic}
              className={`stream-tab ${activeIdx === i ? 'active' : ''}`}
              onClick={() => { setActiveIdx(i); setImgSrc(null); setStale(true) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="stream-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        >
          {imgSrc ? (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="camera"
              className={`stream-img ${stale ? 'stale' : ''}`}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              onLoad={onImgLoad}
              draggable={false}
            />
          ) : (
            <div className="stream-placeholder">
              <span className="stream-placeholder-icon">📷</span>
              <span>{TOPICS[activeIdx].label}</span>
              <span className="stream-placeholder-sub">No signal</span>
            </div>
          )}

          {imgSrc && (
            <div className="stream-overlay-topic">{activeTopic}</div>
          )}
        </div>

        <div className="stream-zoom-bar">
          <button className="btn btn-sm" onClick={() => setZoom(z => Math.min(10, z * 1.25))}>+</button>
          <span className="zoom-label">{(zoom * 100).toFixed(0)}%</span>
          <button className="btn btn-sm" onClick={() => setZoom(z => Math.max(0.1, z / 1.25))}>−</button>
          <button className="btn btn-sm" onClick={resetView}>Reset</button>
        </div>
      </div>
    </Panel>
  )
}
