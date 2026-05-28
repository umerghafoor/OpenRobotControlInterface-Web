import { useState, useEffect } from 'react'
import { ros2Bridge, DetectionResult } from '@/ros2/ROS2Bridge'
import { Panel } from '@/components/layout/PanelGrid'
import './DetectionPanelWidget.css'

interface Summary {
  total: number
  framesWithResults: number
  classCounts: Record<string, number>
}

export function DetectionPanelWidget() {
  const [current, setCurrent] = useState<DetectionResult | null>(null)
  const [summary, setSummary] = useState<Summary>({ total: 0, framesWithResults: 0, classCounts: {} })

  useEffect(() => {
    function onDetection(d: DetectionResult) {
      setCurrent(d)
      setSummary(prev => {
        const counts = { ...prev.classCounts }
        counts[d.className] = (counts[d.className] ?? 0) + 1
        return {
          total: prev.total + (d.count ?? 1),
          framesWithResults: prev.framesWithResults + 1,
          classCounts: counts,
        }
      })
    }
    ros2Bridge.on('detectionResults', onDetection)
    return () => ros2Bridge.off('detectionResults', onDetection)
  }, [])

  const topClass = Object.entries(summary.classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  const uniqueClasses = Object.keys(summary.classCounts).length
  const avgPerFrame = summary.framesWithResults > 0
    ? (summary.total / summary.framesWithResults).toFixed(2) : '0.00'

  return (
    <Panel title="Detection Panel" icon="target">
      <div className="detection-panel">
        <div className="det-section">
          <div className="det-section-title">Current Frame</div>
          {current ? (
            <div className="det-current">
              <div className="det-row">
                <span className="label">Count</span>
                <span className="badge badge-blue">{current.count}</span>
              </div>
              <div className="det-row">
                <span className="label">Class</span>
                <span className="value">{current.className}</span>
              </div>
              <div className="det-row">
                <span className="label">Class ID</span>
                <span className="value">{current.classId}</span>
              </div>
              <div className="det-row">
                <span className="label">Confidence</span>
                <div className="conf-bar-wrap">
                  <div className="conf-bar">
                    <div className="conf-bar-fill" style={{ width: `${current.confidence * 100}%` }} />
                  </div>
                  <span className="conf-pct">{(current.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="det-row">
                <span className="label">BBox</span>
                <span className="value mono">
                  {current.bbox.x},{current.bbox.y} {current.bbox.w}×{current.bbox.h}
                </span>
              </div>
              <div className="det-row">
                <span className="label">Time</span>
                <span className="value mono">{current.timestamp}</span>
              </div>
            </div>
          ) : (
            <div className="det-empty">No detection</div>
          )}
        </div>

        <div className="det-divider" />

        <div className="det-section">
          <div className="det-section-title">Cumulative Summary</div>
          <div className="det-current">
            <div className="det-row"><span className="label">Total</span><span className="value">{summary.total}</span></div>
            <div className="det-row"><span className="label">Frames</span><span className="value">{summary.framesWithResults}</span></div>
            <div className="det-row"><span className="label">Avg/Frame</span><span className="value">{avgPerFrame}</span></div>
            <div className="det-row"><span className="label">Unique Classes</span><span className="value">{uniqueClasses}</span></div>
            <div className="det-row"><span className="label">Top Class</span><span className="value">{topClass}</span></div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
