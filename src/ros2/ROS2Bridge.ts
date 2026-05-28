import ROSLIB from 'roslib'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IMUData {
  ax: number; ay: number; az: number
  gx: number; gy: number; gz: number
}

export interface Coordinates {
  x: number
  y: number
}

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

export class ROS2Bridge extends TypedEmitter {
  private ros: ROSLIB.Ros | null = null
  private status: ConnectionStatus = 'disconnected'
  private subscribers: Map<string, ROSLIB.Topic> = new Map()
  private cmdVelPub: ROSLIB.Topic | null = null
  private robotCmdPub: ROSLIB.Topic | null = null
  private servo1Pub: ROSLIB.Topic | null = null
  private servo2Pub: ROSLIB.Topic | null = null
  private laserPub: ROSLIB.Topic | null = null
  private cameraTopicRefs: Map<string, number> = new Map()

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
    this.subscribers.forEach(sub => sub.unsubscribe())
    this.subscribers.clear()
    this.cameraTopicRefs.clear()
    this.ros?.close()
    this.ros = null
    this.setStatus('disconnected')
  }

  getStatus() { return this.status }

  // Publishers
  publishVelocity(linearX: number, linearY: number, angularZ: number) {
    if (!this.cmdVelPub) return
    this.cmdVelPub.publish(new ROSLIB.Message({
      linear: { x: linearX, y: linearY, z: 0 },
      angular: { x: 0, y: 0, z: angularZ },
    }))
  }

  publishRobotCommand(cmd: string) {
    if (!this.robotCmdPub) return
    this.robotCmdPub.publish(new ROSLIB.Message({ data: cmd }))
  }

  publishServoAngle(servoId: 1 | 2, angle: number) {
    const pub = servoId === 1 ? this.servo1Pub : this.servo2Pub
    if (!pub) return
    pub.publish(new ROSLIB.Message({ data: Math.round(angle) }))
  }

  publishLaser(on: boolean) {
    if (!this.laserPub) return
    this.laserPub.publish(new ROSLIB.Message({ data: on }))
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

  private setStatus(s: ConnectionStatus) {
    this.status = s
    this.emit('statusChange', s)
  }

  private setupPublishers() {
    if (!this.ros) return
    this.cmdVelPub = new ROSLIB.Topic({
      ros: this.ros, name: '/cmd_vel', messageType: 'geometry_msgs/Twist',
    })
    this.robotCmdPub = new ROSLIB.Topic({
      ros: this.ros, name: '/robot_command', messageType: 'std_msgs/String',
    })
    this.servo1Pub = new ROSLIB.Topic({
      ros: this.ros, name: '/servo1/angle', messageType: 'std_msgs/Int16',
    })
    this.servo2Pub = new ROSLIB.Topic({
      ros: this.ros, name: '/servo2/angle', messageType: 'std_msgs/Int16',
    })
    this.laserPub = new ROSLIB.Topic({
      ros: this.ros, name: '/laser/cmd', messageType: 'std_msgs/Bool',
    })
  }

  private setupSubscribers() {
    if (!this.ros) return

    const imuSub = new ROSLIB.Topic({
      ros: this.ros, name: '/imu/data', messageType: 'sensor_msgs/Imu',
    })
    imuSub.subscribe((msg: unknown) => {
      const m = msg as { linear_acceleration: { x: number; y: number; z: number }; angular_velocity: { x: number; y: number; z: number } }
      this.emit('imuData', {
        ax: m.linear_acceleration.x, ay: m.linear_acceleration.y, az: m.linear_acceleration.z,
        gx: m.angular_velocity.x, gy: m.angular_velocity.y, gz: m.angular_velocity.z,
      })
    })
    this.subscribers.set('/imu/data', imuSub)

    const statusSub = new ROSLIB.Topic({
      ros: this.ros, name: '/robot_status', messageType: 'std_msgs/String',
    })
    statusSub.subscribe((msg: unknown) => {
      const m = msg as { data: string }
      this.emit('robotStatus', m.data)
    })
    this.subscribers.set('/robot_status', statusSub)

    const coordSub = new ROSLIB.Topic({
      ros: this.ros, name: '/coordinates', messageType: 'geometry_msgs/PointStamped',
    })
    coordSub.subscribe((msg: unknown) => {
      const m = msg as { point: { x: number; y: number } }
      this.emit('coordinates', { x: m.point.x, y: m.point.y })
    })
    this.subscribers.set('/coordinates', coordSub)

    const coordJsonSub = new ROSLIB.Topic({
      ros: this.ros, name: 'image/coordinates', messageType: 'std_msgs/String',
    })
    coordJsonSub.subscribe((msg: unknown) => {
      const m = msg as { data: string }
      this.emit('coordinatesJson', m.data)
    })
    this.subscribers.set('image/coordinates', coordJsonSub)

    const detSub = new ROSLIB.Topic({
      ros: this.ros, name: '/detections/results', messageType: 'std_msgs/String',
    })
    detSub.subscribe((msg: unknown) => {
      const m = msg as { data: string }
      try {
        const parsed = JSON.parse(m.data) as DetectionResult
        this.emit('detectionResults', parsed)
      } catch { /* ignore malformed */ }
    })
    this.subscribers.set('/detections/results', detSub)

    // re-subscribe any camera topics that were requested before connection
    this.cameraTopicRefs.forEach((_, topic) => this.createCameraSubscriber(topic))
  }

  private createCameraSubscriber(topic: string) {
    if (!this.ros || this.subscribers.has(topic)) return
    const sub = new ROSLIB.Topic({
      ros: this.ros, name: topic, messageType: 'sensor_msgs/CompressedImage',
    })
    sub.subscribe((msg: unknown) => {
      const m = msg as { data: string; format?: string }
      this.emit('imageFrame', { topic, data: m.data, width: 0, height: 0 })
    })
    this.subscribers.set(topic, sub)
  }
}

export const ros2Bridge = new ROS2Bridge()
