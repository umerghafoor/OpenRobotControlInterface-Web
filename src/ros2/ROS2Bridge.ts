import ROSLIB from 'roslib'
import { DEFAULT_TOPICS, type TopicMap } from '@/context/SettingsContext'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IMUData {
  ax: number; ay: number; az: number
  gx: number; gy: number; gz: number
}

export interface Coordinates { x: number; y: number }

export interface DetectionResult {
  count: number
  timestamp: string
  className: string
  confidence: number
  classId: number
  bbox: { x: number; y: number; w: number; h: number }
}

export type ROS2EventMap = {
  statusChange: ConnectionStatus
  imuData: IMUData
  robotStatus: string
  coordinates: Coordinates
  coordinatesJson: string
  detectionResults: DetectionResult
  imageFrame: { topic: string; data: string; width: number; height: number }
}

type Listener<T> = (data: T) => void

class TypedEmitter {
  private listeners: Map<string, Set<Listener<unknown>>> = new Map()

  on<K extends keyof ROS2EventMap>(event: K, fn: Listener<ROS2EventMap[K]>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn as Listener<unknown>)
  }

  off<K extends keyof ROS2EventMap>(event: K, fn: Listener<ROS2EventMap[K]>) {
    this.listeners.get(event)?.delete(fn as Listener<unknown>)
  }

  emit<K extends keyof ROS2EventMap>(event: K, data: ROS2EventMap[K]) {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }
}

function defaultTopicMap(): TopicMap {
  const m: TopicMap = {}
  DEFAULT_TOPICS.forEach(t => { m[t.key] = t.topic })
  return m
}

export class ROS2Bridge extends TypedEmitter {
  private ros: ROSLIB.Ros | null = null
  private status: ConnectionStatus = 'disconnected'
  private subscribers: Map<string, ROSLIB.Topic> = new Map()
  private publishers:  Map<string, ROSLIB.Topic> = new Map()
  private cameraTopicRefs: Map<string, number> = new Map()
  private topicMap: TopicMap = defaultTopicMap()

  /** Apply a new topic map. Reconnect if already connected so new names take effect. */
  applyTopicMap(map: TopicMap) {
    this.topicMap = { ...defaultTopicMap(), ...map }
    if (this.status === 'connected') {
      this.teardownPubSub()
      this.setupPublishers()
      this.setupSubscribers()
    }
  }

  connect(url: string = 'ws://localhost:9090') {
    if (this.status === 'connected' || this.status === 'connecting') return
    this.setStatus('connecting')
    this.ros = new ROSLIB.Ros({ url })

    this.ros.on('connection', () => {
      this.setStatus('connected')
      this.setupPublishers()
      this.setupSubscribers()
    })

    this.ros.on('error', () => this.setStatus('error'))
    this.ros.on('close', () => this.setStatus('disconnected'))
  }

  disconnect() {
    this.teardownPubSub()
    this.cameraTopicRefs.clear()
    this.ros?.close()
    this.ros = null
    this.setStatus('disconnected')
  }

  getStatus() { return this.status }

  t(key: string): string {
    return this.topicMap[key] ?? DEFAULT_TOPICS.find(d => d.key === key)?.topic ?? key
  }

  // ── Publishers ──────────────────────────────────────────────────────────────

  publishVelocity(linearX: number, linearY: number, angularZ: number) {
    this.publishers.get('cmd_vel')?.publish(new ROSLIB.Message({
      linear: { x: linearX, y: linearY, z: 0 },
      angular: { x: 0, y: 0, z: angularZ },
    }))
  }

  publishRobotCommand(cmd: string) {
    this.publishers.get('robot_command')?.publish(new ROSLIB.Message({ data: cmd }))
  }

  publishServoAngle(servoId: 1 | 2, angle: number) {
    const key = servoId === 1 ? 'servo1' : 'servo2'
    this.publishers.get(key)?.publish(new ROSLIB.Message({ data: Math.round(angle) }))
  }

  publishLaser(on: boolean) {
    this.publishers.get('laser')?.publish(new ROSLIB.Message({ data: on }))
  }

  subscribeCameraTopic(topic: string) {
    const refs = (this.cameraTopicRefs.get(topic) ?? 0) + 1
    this.cameraTopicRefs.set(topic, refs)
    if (refs === 1 && this.ros) this.createCameraSubscriber(topic)
  }

  unsubscribeCameraTopic(topic: string) {
    const refs = (this.cameraTopicRefs.get(topic) ?? 0) - 1
    if (refs <= 0) {
      this.cameraTopicRefs.delete(topic)
      this.subscribers.get(topic)?.unsubscribe()
      this.subscribers.delete(topic)
    } else {
      this.cameraTopicRefs.set(topic, refs)
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private setStatus(s: ConnectionStatus) {
    this.status = s
    this.emit('statusChange', s)
  }

  private teardownPubSub() {
    this.subscribers.forEach(sub => sub.unsubscribe())
    this.subscribers.clear()
    this.publishers.clear()
  }

  private setupPublishers() {
    if (!this.ros) return
    const make = (key: string, msgType: string) => new ROSLIB.Topic({ ros: this.ros!, name: this.t(key), messageType: msgType })
    this.publishers.set('cmd_vel',       make('cmd_vel',       'geometry_msgs/Twist'))
    this.publishers.set('robot_command', make('robot_command', 'std_msgs/String'))
    this.publishers.set('servo1',        make('servo1',        'std_msgs/Int16'))
    this.publishers.set('servo2',        make('servo2',        'std_msgs/Int16'))
    this.publishers.set('laser',         make('laser',         'std_msgs/Bool'))
  }

  private setupSubscribers() {
    if (!this.ros) return

    const imuSub = new ROSLIB.Topic({ ros: this.ros, name: this.t('imu'), messageType: 'sensor_msgs/Imu' })
    imuSub.subscribe((msg: unknown) => {
      const m = msg as { linear_acceleration: { x: number; y: number; z: number }; angular_velocity: { x: number; y: number; z: number } }
      this.emit('imuData', { ax: m.linear_acceleration.x, ay: m.linear_acceleration.y, az: m.linear_acceleration.z, gx: m.angular_velocity.x, gy: m.angular_velocity.y, gz: m.angular_velocity.z })
    })
    this.subscribers.set('imu', imuSub)

    const statusSub = new ROSLIB.Topic({ ros: this.ros, name: this.t('robot_status'), messageType: 'std_msgs/String' })
    statusSub.subscribe((msg: unknown) => { this.emit('robotStatus', (msg as { data: string }).data) })
    this.subscribers.set('robot_status', statusSub)

    const coordSub = new ROSLIB.Topic({ ros: this.ros, name: this.t('coordinates'), messageType: 'geometry_msgs/PointStamped' })
    coordSub.subscribe((msg: unknown) => {
      const m = msg as { point: { x: number; y: number } }
      this.emit('coordinates', { x: m.point.x, y: m.point.y })
    })
    this.subscribers.set('coordinates', coordSub)

    const coordJsonSub = new ROSLIB.Topic({ ros: this.ros, name: this.t('coord_json'), messageType: 'std_msgs/String' })
    coordJsonSub.subscribe((msg: unknown) => { this.emit('coordinatesJson', (msg as { data: string }).data) })
    this.subscribers.set('coord_json', coordJsonSub)

    const detSub = new ROSLIB.Topic({ ros: this.ros, name: this.t('detections'), messageType: 'std_msgs/String' })
    detSub.subscribe((msg: unknown) => {
      try { this.emit('detectionResults', JSON.parse((msg as { data: string }).data) as DetectionResult) } catch { /* ignore */ }
    })
    this.subscribers.set('detections', detSub)

    // re-subscribe camera topics that were requested before connection
    this.cameraTopicRefs.forEach((_, topic) => this.createCameraSubscriber(topic))
  }

  private createCameraSubscriber(topic: string) {
    if (!this.ros || this.subscribers.has(topic)) return
    const sub = new ROSLIB.Topic({ ros: this.ros, name: topic, messageType: 'sensor_msgs/CompressedImage' })
    sub.subscribe((msg: unknown) => {
      this.emit('imageFrame', { topic, data: (msg as { data: string }).data, width: 0, height: 0 })
    })
    this.subscribers.set(topic, sub)
  }
}

export const ros2Bridge = new ROS2Bridge()
