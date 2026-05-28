import { useROS2Topic } from '@/ros2/useROS2'
import { Panel } from '@/components/layout/PanelGrid'
import './SensorDataWidget.css'

interface TelemetryCell {
  name: string
  value: number | string
  unit?: string
  min?: number
  max?: number
}

function TelemetryRow({ cell }: { cell: TelemetryCell }) {
  const numVal = typeof cell.value === 'number' ? cell.value : null
  const pct = numVal !== null && cell.min !== undefined && cell.max !== undefined
    ? Math.max(0, Math.min(100, ((numVal - cell.min) / (cell.max - cell.min)) * 100))
    : null

  return (
    <div className="telemetry-row">
      <span className="telemetry-name">{cell.name}</span>
      <div className="telemetry-value-col">
        {pct !== null && (
          <div className="telemetry-bar">
            <div className="telemetry-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
        <span className="telemetry-value">
          {typeof cell.value === 'number' ? cell.value.toFixed(3) : cell.value}
          {cell.unit && <span className="telemetry-unit">{cell.unit}</span>}
        </span>
      </div>
    </div>
  )
}

export function SensorDataWidget() {
  const imu = useROS2Topic('imuData', { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 })
  const status = useROS2Topic('robotStatus', '—')
  const coords = useROS2Topic('coordinates', { x: 0, y: 0 })

  const cells: TelemetryCell[] = [
    { name: 'Accel X', value: imu.ax, unit: 'm/s²', min: -20, max: 20 },
    { name: 'Accel Y', value: imu.ay, unit: 'm/s²', min: -20, max: 20 },
    { name: 'Accel Z', value: imu.az, unit: 'm/s²', min: -20, max: 20 },
    { name: 'Gyro X', value: imu.gx, unit: 'rad/s', min: -10, max: 10 },
    { name: 'Gyro Y', value: imu.gy, unit: 'rad/s', min: -10, max: 10 },
    { name: 'Gyro Z', value: imu.gz, unit: 'rad/s', min: -10, max: 10 },
    { name: 'Pos X', value: coords.x, unit: 'm' },
    { name: 'Pos Y', value: coords.y, unit: 'm' },
    { name: 'Status', value: status },
  ]

  return (
    <Panel title="Sensor Data">
      <div className="sensor-table">
        {cells.map(cell => (
          <TelemetryRow key={cell.name} cell={cell} />
        ))}
      </div>
    </Panel>
  )
}
