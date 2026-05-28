import { useEffect, useRef, useState } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { IMUData } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './IMU3DWidget.css'

const HISTORY = 200

function drawCube(ctx: CanvasRenderingContext2D, ax: number, ay: number, az: number, w: number, h: number) {
  const pitch = Math.atan2(ax, az)
  const roll  = Math.atan2(-ay, az)

  const cos = Math.cos, sin = Math.sin
  function rotX(p: number[]): number[] {
    return [p[0], cos(roll)*p[1]-sin(roll)*p[2], sin(roll)*p[1]+cos(roll)*p[2]]
  }
  function rotZ(p: number[]): number[] {
    return [cos(pitch)*p[0]-sin(pitch)*p[1], sin(pitch)*p[0]+cos(pitch)*p[1], p[2]]
  }
  function project(p: number[]): [number, number] {
    const fov = 4.0
    const z = p[2] + fov
    return [w/2 + (p[0]/z)*w*0.35, h/2 - (p[1]/z)*h*0.35]
  }

  const size = 0.7
  const rawVerts = [
    [-size,-size,-size],[size,-size,-size],[size,size,-size],[-size,size,-size],
    [-size,-size, size],[size,-size, size],[size,size, size],[-size,size, size],
  ]
  const verts = rawVerts.map(v => rotX(rotZ(v)))
  const faces = [
    { idx: [0,1,2,3], color: '#4f46e5' },
    { idx: [4,5,6,7], color: '#7c3aed' },
    { idx: [0,1,5,4], color: '#2563eb' },
    { idx: [2,3,7,6], color: '#0ea5e9' },
    { idx: [1,2,6,5], color: '#6366f1' },
    { idx: [0,3,7,4], color: '#818cf8' },
  ]

  const sorted = faces.map(f => ({
    ...f,
    depth: f.idx.reduce((s, i) => s + verts[i][2], 0) / 4,
  })).sort((a, b) => a.depth - b.depth)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'transparent'

  for (const face of sorted) {
    const pts = face.idx.map(i => project(verts[i]))
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    ctx.fillStyle = face.color
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

interface GraphProps { label: string; color: string; data: number[] }

function MiniGraph({ label, color, data }: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [data, color])

  const latest = data[data.length - 1] ?? 0

  return (
    <div className="mini-graph">
      <div className="mini-graph-header">
        <span className="mini-graph-label" style={{ color }}>{label}</span>
        <span className="mini-graph-value">{latest.toFixed(3)}</span>
      </div>
      <canvas ref={canvasRef} width={180} height={36} className="mini-graph-canvas" />
    </div>
  )
}

export function IMU3DWidget() {
  const cubeRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<{ ax: number[]; ay: number[]; az: number[]; gx: number[]; gy: number[]; gz: number[] }>({
    ax: [], ay: [], az: [], gx: [], gy: [], gz: [],
  })
  const [snapshot, setSnapshot] = useState(dataRef.current)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    function onIMU(d: IMUData) {
      const push = (arr: number[], v: number) => { arr.push(v); if (arr.length > HISTORY) arr.shift() }
      push(dataRef.current.ax, d.ax); push(dataRef.current.ay, d.ay); push(dataRef.current.az, d.az)
      push(dataRef.current.gx, d.gx); push(dataRef.current.gy, d.gy); push(dataRef.current.gz, d.gz)
    }
    ros2Bridge.on('imuData', onIMU)
    return () => ros2Bridge.off('imuData', onIMU)
  }, [])

  useEffect(() => {
    let raf: number
    function loop() {
      const d = dataRef.current
      const canvas = cubeRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')!
        const ax = d.ax[d.ax.length - 1] ?? 0
        const ay = d.ay[d.ay.length - 1] ?? 0
        const az = d.az[d.az.length - 1] ?? 9.8
        drawCube(ctx, ax, ay, az, canvas.width, canvas.height)
      }

      frameRef.current++
      if (frameRef.current % 2 === 0) {
        setSnapshot({ ...dataRef.current })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <Panel title="IMU 3D View">
      <div className="imu3d">
        <div className="cube-container">
          <canvas ref={cubeRef} width={160} height={160} className="cube-canvas" />
        </div>
        <div className="imu-graphs">
          <MiniGraph label="Ax" color="#3b82f6" data={snapshot.ax} />
          <MiniGraph label="Ay" color="#10b981" data={snapshot.ay} />
          <MiniGraph label="Az" color="#ef4444" data={snapshot.az} />
          <MiniGraph label="Gx" color="#8b5cf6" data={snapshot.gx} />
          <MiniGraph label="Gy" color="#f59e0b" data={snapshot.gy} />
          <MiniGraph label="Gz" color="#06b6d4" data={snapshot.gz} />
        </div>
      </div>
    </Panel>
  )
}
