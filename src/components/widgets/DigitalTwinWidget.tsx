import { useState, useEffect, useRef } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './DigitalTwinWidget.css'

type TwinMode = 'Synchronized' | 'Simulated' | 'Offline'

interface TwinState {
  x: number; y: number; heading: number
  vx: number; vy: number; vz: number
  ax: number; ay: number; az: number
  batteryLevel: number
  robotStatus: string
  mode: TwinMode
}

const INITIAL: TwinState = {
  x: 0, y: 0, heading: 0,
  vx: 0, vy: 0, vz: 0,
  ax: 0, ay: 0, az: 0,
  batteryLevel: 1.0,
  robotStatus: '—',
  mode: 'Offline',
}

const SIM_HZ = 50

export function DigitalTwinWidget() {
  const [state, setState] = useState<TwinState>(INITIAL)
  const stateRef = useRef<TwinState>(INITIAL)
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  function setMode(mode: TwinMode) {
    if (mode === 'Simulated') startSim()
    else stopSim()
    setState(s => ({ ...s, mode }))
    stateRef.current.mode = mode
  }

  function startSim() {
    if (simTimer.current) return
    const dt = 1 / SIM_HZ
    simTimer.current = setInterval(() => {
      const s = stateRef.current
      const newX = s.x + s.vx * Math.cos(s.heading) * dt - s.vy * Math.sin(s.heading) * dt
      const newY = s.y + s.vx * Math.sin(s.heading) * dt + s.vy * Math.cos(s.heading) * dt
      const newH = s.heading + s.vz * dt
      const next = { ...s, x: newX, y: newY, heading: newH }
      stateRef.current = next
      setState({ ...next })
    }, 1000 / SIM_HZ)
  }

  function stopSim() {
    clearInterval(simTimer.current!)
    simTimer.current = null
  }

  // Sync from ROS2 when in Synchronized mode
  useEffect(() => {
    function onCoords({ x, y }: { x: number; y: number }) {
      if (stateRef.current.mode !== 'Synchronized') return
      stateRef.current.x = x
      stateRef.current.y = y
      setState(s => ({ ...s, x, y }))
    }
    function onIMU({ ax, ay, az }: { ax: number; ay: number; az: number }) {
      if (stateRef.current.mode !== 'Synchronized') return
      stateRef.current.ax = ax; stateRef.current.ay = ay; stateRef.current.az = az
      setState(s => ({ ...s, ax, ay, az }))
    }
    function onStatus(robotStatus: string) {
      stateRef.current.robotStatus = robotStatus
      setState(s => ({ ...s, robotStatus }))
    }
    ros2Bridge.on('coordinates', onCoords)
    ros2Bridge.on('imuData', onIMU)
    ros2Bridge.on('robotStatus', onStatus)
    return () => {
      ros2Bridge.off('coordinates', onCoords)
      ros2Bridge.off('imuData', onIMU)
      ros2Bridge.off('robotStatus', onStatus)
    }
  }, [])

  useEffect(() => () => stopSim(), [])

  function reset() {
    const next = { ...INITIAL, mode: state.mode }
    stateRef.current = next
    setState(next)
  }

  // Simulated velocity command from motion widget publishes → twin follows
  function setSimVelocity(vx: number, vz: number) {
    stateRef.current.vx = vx
    stateRef.current.vz = vz
    setState(s => ({ ...s, vx, vz }))
  }

  const modeColors: Record<TwinMode, string> = {
    Synchronized: 'badge-blue',
    Simulated: 'badge-green',
    Offline: 'badge-gray',
  }

  return (
    <Panel title="Digital Twin" icon="robot" headerExtra={
      <span className={`badge ${modeColors[state.mode]}`}>{state.mode}</span>
    }>
      <div className="twin-widget">
        <div className="twin-mode-selector">
          {(['Synchronized', 'Simulated', 'Offline'] as TwinMode[]).map(m => (
            <button
              key={m}
              className={`btn btn-sm ${state.mode === m ? 'btn-primary' : ''}`}
              onClick={() => setMode(m)}
            >{m}</button>
          ))}
        </div>

        <div className="twin-state-grid">
          <TwinRow label="X" value={state.x} unit="m" />
          <TwinRow label="Y" value={state.y} unit="m" />
          <TwinRow label="Heading" value={state.heading * 180 / Math.PI} unit="°" />
          <TwinRow label="Vel X" value={state.vx} unit="m/s" />
          <TwinRow label="Vel Ang" value={state.vz} unit="rad/s" />
          <TwinRow label="Accel X" value={state.ax} unit="m/s²" />
          <TwinRow label="Accel Y" value={state.ay} unit="m/s²" />
          <TwinRow label="Accel Z" value={state.az} unit="m/s²" />
        </div>

        <div className="twin-battery">
          <span className="label">Battery</span>
          <div className="batt-bar">
            <div
              className="batt-fill"
              style={{
                width: `${state.batteryLevel * 100}%`,
                background: state.batteryLevel > 0.5 ? 'var(--success)' : state.batteryLevel > 0.2 ? 'var(--warning)' : 'var(--error)',
              }}
            />
          </div>
          <span className="label">{(state.batteryLevel * 100).toFixed(0)}%</span>
        </div>

        <div className="twin-status">
          <span className="label">Status</span>
          <span className="value">{state.robotStatus}</span>
        </div>

        {state.mode === 'Simulated' && (
          <div className="twin-sim-controls">
            <div className="label" style={{ marginBottom: 4 }}>Sim Velocity</div>
            <div className="sim-row">
              <label className="label">Lin X</label>
              <input type="range" min={-0.5} max={0.5} step={0.05} value={state.vx} onChange={e => setSimVelocity(+e.target.value, state.vz)} />
              <span className="sim-val">{state.vx.toFixed(2)}</span>
            </div>
            <div className="sim-row">
              <label className="label">Ang Z</label>
              <input type="range" min={-1} max={1} step={0.05} value={state.vz} onChange={e => setSimVelocity(state.vx, +e.target.value)} />
              <span className="sim-val">{state.vz.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button className="btn btn-sm" style={{ marginTop: 4 }} onClick={reset}>Reset State</button>
      </div>
    </Panel>
  )
}

function TwinRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="twin-row">
      <span className="label">{label}</span>
      <span className="value mono">{value.toFixed(3)} <span className="telemetry-unit">{unit}</span></span>
    </div>
  )
}
