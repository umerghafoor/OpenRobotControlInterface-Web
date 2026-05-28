import { useEffect, useRef, useState } from 'react'
import { ros2Bridge } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './RobotMapWidget.css'

interface Pose { x: number; y: number; heading: number }

const TRAIL_MAX = 500

function worldToCanvas(wx: number, wy: number, trail: Pose[], w: number, h: number): [number, number] {
  if (trail.length === 0) return [w / 2, h / 2]
  const xs = trail.map(p => p.x)
  const ys = trail.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 4
  const rangeY = maxY - minY || 4
  const scale = Math.min((w - 40) / rangeX, (h - 40) / rangeY)
  const cx = w / 2 - ((minX + maxX) / 2) * scale
  const cy = h / 2 + ((minY + maxY) / 2) * scale
  return [cx + wx * scale, cy - wy * scale]
}

export function RobotMapWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<Pose[]>([])
  const poseRef = useRef<Pose>({ x: 0, y: 0, heading: 0 })
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function onCoords({ x, y }: { x: number; y: number }) {
      poseRef.current.x = x
      poseRef.current.y = y
      setCoords({ x, y })
      const trail = trailRef.current
      trail.push({ ...poseRef.current })
      if (trail.length > TRAIL_MAX) trail.shift()
    }
    ros2Bridge.on('coordinates', onCoords)
    return () => ros2Bridge.off('coordinates', onCoords)
  }, [])

  useEffect(() => {
    let raf: number
    function draw() {
      const canvas = canvasRef.current
      if (!canvas) { raf = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')!
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = 'rgba(128,128,128,0.15)'
      ctx.lineWidth = 1
      const gs = 40
      for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

      const trail = trailRef.current
      if (trail.length > 1) {
        // Trail
        ctx.strokeStyle = 'rgba(99,102,241,0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        trail.forEach((p, i) => {
          const [cx, cy] = worldToCanvas(p.x, p.y, trail, w, h)
          i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
        })
        ctx.stroke()
      }

      // Robot
      const pose = poseRef.current
      const [rx, ry] = worldToCanvas(pose.x, pose.y, trail.length > 0 ? trail : [pose], w, h)
      const angle = pose.heading

      ctx.save()
      ctx.translate(rx, ry)
      ctx.rotate(-angle)
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(10, 10)
      ctx.lineTo(0, 6)
      ctx.lineTo(-10, 10)
      ctx.closePath()
      ctx.fillStyle = '#6366f1'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()

      // Origin cross
      const [ox, oy] = worldToCanvas(0, 0, trail.length > 0 ? trail : [{ x: 0, y: 0, heading: 0 }], w, h)
      ctx.strokeStyle = 'rgba(255,100,100,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(ox - 8, oy); ctx.lineTo(ox + 8, oy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ox, oy - 8); ctx.lineTo(ox, oy + 8); ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  function clearTrail() { trailRef.current = [] }

  return (
    <Panel title="Robot Map" headerExtra={
      <button className="btn btn-sm" onClick={clearTrail}>Clear</button>
    }>
      <div className="robot-map">
        <canvas ref={canvasRef} width={400} height={300} className="map-canvas" />
        <div className="map-coords">
          <span className="label">X</span><span className="value">{coords.x.toFixed(3)} m</span>
          <span className="label">Y</span><span className="value">{coords.y.toFixed(3)} m</span>
        </div>
      </div>
    </Panel>
  )
}
