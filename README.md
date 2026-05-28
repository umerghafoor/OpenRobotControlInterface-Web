# OpenRobotControl Web

Browser-based port of OpenRobotControl. React 18 + TypeScript + Vite, communicating with ROS2 via **rosbridge_suite** and **roslibjs**.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production dist/
```

## ROS2 Bridge Setup

Install rosbridge on your robot / ROS2 machine:

```bash
sudo apt install ros-$ROS_DISTRO-rosbridge-suite
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
# default port 9090
```

In the web app, click **Connect** (header, top right). The default URL is `ws://localhost:9090`. Click the ⚙ button to change it.

## Features

| Widget | ROS2 Topics |
|---|---|
| Motion Control | publishes `/cmd_vel` |
| Command Control | publishes `/cmd_vel`, `/robot_command` |
| Sensor Data | `/imu/data`, `/robot_status`, `/coordinates` |
| Video Stream | `/camera/color_jpeg`, `camera/raw`, `/camera/detection`, `/camera/depth` |
| IMU 3D | `/imu/data` — 3D cube + 6-axis scrolling graphs |
| Detection Panel | `/detections/results` (JSON) |
| Robot Map | `/coordinates` — 2D overhead trail map |
| Digital Twin | Synchronized / Simulated / Offline modes |

## Architecture

```
src/
  ros2/
    ROS2Bridge.ts      # singleton WebSocket↔ROS2 adapter
    useROS2.ts         # React hooks for status and topic data
  components/
    layout/
      Header.tsx       # connection status bar + theme toggle
      PanelGrid.tsx    # Panel primitive
    widgets/
      MotionControlWidget.tsx
      CommandControlWidget.tsx
      SensorDataWidget.tsx
      VideoStreamWidget.tsx
      IMU3DWidget.tsx
      DetectionPanelWidget.tsx
      RobotMapWidget.tsx
      DigitalTwinWidget.tsx
  context/
    ThemeContext.tsx   # light/dark persisted to localStorage
  styles/
    theme.css          # CSS custom properties for both themes
```
