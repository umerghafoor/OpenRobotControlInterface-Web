import { useState, useRef } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './CommandControlWidget.css'

export function CommandControlWidget() {
  const [linear, setLinear] = useState(0)
  const [angular, setAngular] = useState(0)
  const [command, setCommand] = useState('')
  const publishRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function handleLinear(v: number) {
    setLinear(v)
    ros2Bridge.publishVelocity(v, 0, angular)
  }

  function handleAngular(v: number) {
    setAngular(v)
    ros2Bridge.publishVelocity(linear, 0, v)
  }

  function stop() {
    setLinear(0)
    setAngular(0)
    ros2Bridge.publishVelocity(0, 0, 0)
  }

  function emergencyStop() {
    stop()
    ros2Bridge.publishRobotCommand('EMERGENCY_STOP')
  }

  function sendCommand() {
    if (command.trim()) {
      ros2Bridge.publishRobotCommand(command.trim())
      setCommand('')
    }
  }

  return (
    <Panel title="Command Control" icon="bolt">
      <div className="cmd-control">
        <div className="velocity-sliders">
          <div className="vel-group">
            <div className="vel-label">
              <span className="label">Linear X</span>
              <span className="value">{linear.toFixed(2)} m/s</span>
            </div>
            <input
              type="range" min={-1} max={1} step={0.05} value={linear}
              onChange={e => handleLinear(+e.target.value)}
              className="vel-slider"
            />
          </div>

          <div className="vel-group">
            <div className="vel-label">
              <span className="label">Angular Z</span>
              <span className="value">{angular.toFixed(2)} rad/s</span>
            </div>
            <input
              type="range" min={-1} max={1} step={0.05} value={angular}
              onChange={e => handleAngular(+e.target.value)}
              className="vel-slider"
            />
          </div>
        </div>

        <div className="cmd-buttons">
          <button className="btn" style={{ flex: 1 }} onClick={stop}>Stop</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={emergencyStop}>E-Stop</button>
        </div>

        <div className="cmd-input-row">
          <input
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendCommand()}
            placeholder="Send robot command…"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={sendCommand}>Send</button>
        </div>
      </div>
    </Panel>
  )
}
