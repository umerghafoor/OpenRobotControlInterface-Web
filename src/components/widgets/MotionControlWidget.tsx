import { useState, useEffect, useRef, useCallback } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './MotionControlWidget.css'

const MAX_LINEAR = 0.5
const MAX_ANGULAR = 0.8

type Dir = 'fwdLeft' | 'fwd' | 'fwdRight' | 'left' | 'stop' | 'right' | 'backLeft' | 'back' | 'backRight' | 'spinLeft' | 'spinRight'

function computeVelocity(dir: Dir, speed: number, radius: number): [number, number] {
  const lin = speed * MAX_LINEAR
  const ang = speed * MAX_ANGULAR
  const curve = radius > 0.1 ? lin / radius : ang
  switch (dir) {
    case 'fwd':       return [lin, 0]
    case 'back':      return [-lin, 0]
    case 'left':      return [0, curve]
    case 'right':     return [0, -curve]
    case 'fwdLeft':   return [lin, curve]
    case 'fwdRight':  return [lin, -curve]
    case 'backLeft':  return [-lin, curve]
    case 'backRight': return [-lin, -curve]
    case 'spinLeft':  return [0, ang]
    case 'spinRight': return [0, -ang]
    default:          return [0, 0]
  }
}

export function MotionControlWidget() {
  const [speed, setSpeed] = useState(0.5)
  const [radius, setRadius] = useState(1.0)
  const [pinned, setPinned] = useState(false)
  const [active, setActive] = useState<Dir | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const publish = useCallback((dir: Dir) => {
    const [lin, ang] = computeVelocity(dir, speed, radius)
    ros2Bridge.publishVelocity(lin, 0, ang)
  }, [speed, radius])

  const startDir = useCallback((dir: Dir) => {
    setActive(dir)
    publish(dir)
    if (!pinned) {
      timerRef.current = setInterval(() => publish(dir), 100)
    }
  }, [publish, pinned])

  const stopDir = useCallback(() => {
    if (!pinned) {
      clearInterval(timerRef.current!)
      timerRef.current = null
      setActive(null)
      ros2Bridge.publishVelocity(0, 0, 0)
    }
  }, [pinned])

  // Pinned republish timer
  useEffect(() => {
    if (pinned && active) {
      timerRef.current = setInterval(() => publish(active), 100)
    } else {
      clearInterval(timerRef.current!)
      timerRef.current = null
    }
    return () => clearInterval(timerRef.current!)
  }, [pinned, active, publish])

  function handleStop() {
    clearInterval(timerRef.current!)
    timerRef.current = null
    setActive(null)
    setPinned(false)
    ros2Bridge.publishVelocity(0, 0, 0)
  }

  const dpad: { dir: Dir; label: string; col: number; row: number }[] = [
    { dir: 'fwdLeft', label: '↖', col: 1, row: 1 },
    { dir: 'fwd', label: '↑', col: 2, row: 1 },
    { dir: 'fwdRight', label: '↗', col: 3, row: 1 },
    { dir: 'left', label: '←', col: 1, row: 2 },
    { dir: 'stop', label: '■', col: 2, row: 2 },
    { dir: 'right', label: '→', col: 3, row: 2 },
    { dir: 'backLeft', label: '↙', col: 1, row: 3 },
    { dir: 'back', label: '↓', col: 2, row: 3 },
    { dir: 'backRight', label: '↘', col: 3, row: 3 },
  ]

  return (
    <Panel title="Motion Control" headerExtra={
      <label className="pin-toggle">
        <input type="checkbox" checked={pinned} onChange={e => { setPinned(e.target.checked); if (!e.target.checked) handleStop() }} />
        Pin
      </label>
    }>
      <div className="motion-control">
        <div className="dpad">
          {dpad.map(({ dir, label, col, row }) => (
            <button
              key={dir}
              className={`dpad-btn ${dir === 'stop' ? 'dpad-center' : ''} ${active === dir ? 'active' : ''}`}
              style={{ gridColumn: col, gridRow: row }}
              onPointerDown={() => dir === 'stop' ? handleStop() : startDir(dir)}
              onPointerUp={stopDir}
              onPointerLeave={stopDir}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="spin-buttons">
          <button
            className={`dpad-btn spin-btn ${active === 'spinLeft' ? 'active' : ''}`}
            onPointerDown={() => startDir('spinLeft')}
            onPointerUp={stopDir}
            onPointerLeave={stopDir}
          >↺ Spin L</button>
          <button
            className={`dpad-btn spin-btn ${active === 'spinRight' ? 'active' : ''}`}
            onPointerDown={() => startDir('spinRight')}
            onPointerUp={stopDir}
            onPointerLeave={stopDir}
          >↻ Spin R</button>
        </div>

        <div className="slider-group">
          <div className="slider-row">
            <label className="label">Speed</label>
            <input type="range" min={0} max={1} step={0.05} value={speed} onChange={e => setSpeed(+e.target.value)} />
            <span className="value">{speed.toFixed(2)}</span>
          </div>
          <div className="slider-row">
            <label className="label">Radius (m)</label>
            <input type="range" min={0.1} max={5} step={0.1} value={radius} onChange={e => setRadius(+e.target.value)} />
            <span className="value">{radius.toFixed(1)}</span>
          </div>
        </div>

        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={handleStop}>
          Emergency Stop
        </button>
      </div>
    </Panel>
  )
}
