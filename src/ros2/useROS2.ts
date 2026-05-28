import { useState, useEffect, useCallback } from 'react'
import { ros2Bridge, ConnectionStatus, ROS2EventMap } from './ROS2Bridge'

export function useROS2Status() {
  const [status, setStatus] = useState<ConnectionStatus>(ros2Bridge.getStatus())

  useEffect(() => {
    ros2Bridge.on('statusChange', setStatus)
    return () => ros2Bridge.off('statusChange', setStatus)
  }, [])

  const connect = useCallback((url?: string) => ros2Bridge.connect(url), [])
  const disconnect = useCallback(() => ros2Bridge.disconnect(), [])

  return { status, connect, disconnect }
}

export function useROS2Topic<K extends keyof ROS2EventMap>(
  event: K,
  initialValue: ROS2EventMap[K],
): ROS2EventMap[K] {
  const [value, setValue] = useState<ROS2EventMap[K]>(initialValue)

  useEffect(() => {
    ros2Bridge.on(event, setValue as (d: ROS2EventMap[K]) => void)
    return () => ros2Bridge.off(event, setValue as (d: ROS2EventMap[K]) => void)
  }, [event])

  return value
}
