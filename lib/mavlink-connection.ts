"use client"

import type { TelemetryData, MAVLinkMessage, Waypoint } from "./mavlink-types"

export class MAVLinkConnection {
  private ws: WebSocket | null = null
  private reconnectInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private onTelemetryUpdate: ((data: TelemetryData) => void) | null = null
  private onConnectionChange: ((connected: boolean, port?: string, baudRate?: string) => void) | null = null
  private onWaypointsUpdate: ((waypoints: Waypoint[]) => void) | null = null
  private manualDisconnect = false

  private telemetryData: TelemetryData = {
    connected: false,
    armed: false,
    mode: "UNKNOWN",
    battery: { voltage: 0.0, current: 0.0, percentage: 0.0 },
    gps: { fix_type: 0, satellites: 0, hdop: 99.99, lat: 0.0, lon: 0.0 },
    position: { lat: 0.0, lon: 0.0, alt_amsl: 0.0, alt_rel: 0.0, heading: 0.0 },
    velocity: { ground_speed: 0.0, air_speed: 0.0, vertical_speed: 0.0 },
    attitude: { roll: 0.0, pitch: 0.0, yaw: 0.0 },
    rc: { rssi: 0, channels: [] },
    system: { load: 0.0, errors: 0, status: 0 },
    mission: { current_wp: 0, total_wp: 0 },
    last_heartbeat: 0,
  }

  connect() {
    this.manualDisconnect = false
    try {
      this.ws = new WebSocket("ws://localhost:8080/mavlink")

      this.ws.onopen = () => {
        console.log("MAVLink WebSocket connected")
        this.startHeartbeatCheck()
        this.onConnectionChange?.(true, "COM3", "57600") // Simulated port info
      }

      this.ws.onmessage = (event) => {
        try {
          const message: MAVLinkMessage = JSON.parse(event.data)
          this.handleMAVLinkMessage(message)
        } catch (error) {
          console.error("Error parsing MAVLink message:", error)
        }
      }

      this.ws.onclose = () => {
        console.log("MAVLink WebSocket disconnected")
        this.telemetryData.connected = false
        this.onConnectionChange?.(false)
        this.onTelemetryUpdate?.(this.telemetryData)

        // Only attempt reconnection if not manually disconnected
        if (!this.manualDisconnect) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error("MAVLink WebSocket error:", error)
        this.onConnectionChange?.(false)
      }
    } catch (error) {
      console.error("Failed to connect to MAVLink service:", error)
      this.onConnectionChange?.(false)
    }
  }

  disconnect() {
    this.manualDisconnect = true

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.telemetryData.connected = false
    this.onConnectionChange?.(false)
    this.onTelemetryUpdate?.(this.telemetryData)
  }

  private scheduleReconnect() {
    if (this.reconnectInterval || this.manualDisconnect) return

    this.reconnectInterval = setInterval(() => {
      if (!this.manualDisconnect) {
        console.log("Attempting to reconnect to MAVLink service...")
        this.connect()
      } else {
        clearInterval(this.reconnectInterval!)
        this.reconnectInterval = null
      }
    }, 5000)
  }

  private startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      if (now - this.telemetryData.last_heartbeat > 3000) {
        this.telemetryData.connected = false
        this.onConnectionChange?.(false)
        this.onTelemetryUpdate?.(this.telemetryData)
      }
    }, 1000)
  }

  private handleMAVLinkMessage(message: MAVLinkMessage) {
    switch (message.name) {
      case "HEARTBEAT":
        this.handleHeartbeat(message.payload)
        break
      case "SYS_STATUS":
        this.handleSysStatus(message.payload)
        break
      case "GLOBAL_POSITION_INT":
        this.handleGlobalPositionInt(message.payload)
        break
      case "ATTITUDE":
        this.handleAttitude(message.payload)
        break
      case "GPS_RAW_INT":
        this.handleGpsRawInt(message.payload)
        break
      case "VFR_HUD":
        this.handleVfrHud(message.payload)
        break
      case "RC_CHANNELS":
        this.handleRcChannels(message.payload)
        break
      case "MISSION_CURRENT":
        this.handleMissionCurrent(message.payload)
        break
      case "MISSION_ITEM_INT":
        this.handleMissionItem(message.payload)
        break
    }

    this.onTelemetryUpdate?.(this.telemetryData)
  }

  private handleHeartbeat(payload: any) {
    this.telemetryData.connected = true
    this.telemetryData.last_heartbeat = Date.now()

    // Decode flight mode from custom_mode
    this.telemetryData.mode = this.decodeFlightMode(payload.custom_mode, payload.autopilot)

    // Check if armed
    this.telemetryData.armed = (payload.base_mode & 128) !== 0 // MAV_MODE_FLAG_SAFETY_ARMED
  }

  private handleSysStatus(payload: any) {
    this.telemetryData.battery.voltage = payload.voltage_battery / 1000 // mV to V
    this.telemetryData.battery.current = payload.current_battery / 100 // cA to A
    this.telemetryData.battery.percentage = payload.battery_remaining
    this.telemetryData.system.load = payload.load / 10 // 0.1% units
    this.telemetryData.system.errors = payload.errors_comm
  }

  private handleGlobalPositionInt(payload: any) {
    this.telemetryData.position.lat = payload.lat / 1e7
    this.telemetryData.position.lon = payload.lon / 1e7
    this.telemetryData.position.alt_amsl = payload.alt / 1000 // mm to m
    this.telemetryData.position.alt_rel = payload.relative_alt / 1000 // mm to m
    this.telemetryData.position.heading = payload.hdg / 100 // centidegrees to degrees

    this.telemetryData.velocity.ground_speed = Math.sqrt(Math.pow(payload.vx / 100, 2) + Math.pow(payload.vy / 100, 2)) // cm/s to m/s
    this.telemetryData.velocity.vertical_speed = -payload.vz / 100 // cm/s to m/s (NED to ENU)
  }

  private handleAttitude(payload: any) {
    this.telemetryData.attitude.roll = payload.roll * (180 / Math.PI) // rad to deg
    this.telemetryData.attitude.pitch = payload.pitch * (180 / Math.PI) // rad to deg
    this.telemetryData.attitude.yaw = payload.yaw * (180 / Math.PI) // rad to deg
  }

  private handleGpsRawInt(payload: any) {
    this.telemetryData.gps.fix_type = payload.fix_type
    this.telemetryData.gps.satellites = payload.satellites_visible
    this.telemetryData.gps.hdop = payload.eph / 100 // cm to m
    this.telemetryData.gps.lat = payload.lat / 1e7
    this.telemetryData.gps.lon = payload.lon / 1e7
  }

  private handleVfrHud(payload: any) {
    this.telemetryData.velocity.air_speed = payload.airspeed
    this.telemetryData.velocity.ground_speed = payload.groundspeed
  }

  private handleRcChannels(payload: any) {
    this.telemetryData.rc.rssi = payload.rssi
    this.telemetryData.rc.channels = [
      payload.chan1_raw,
      payload.chan2_raw,
      payload.chan3_raw,
      payload.chan4_raw,
      payload.chan5_raw,
      payload.chan6_raw,
      payload.chan7_raw,
      payload.chan8_raw,
    ]
  }

  private handleMissionCurrent(payload: any) {
    this.telemetryData.mission.current_wp = payload.seq
  }

  private handleMissionItem(payload: any) {
    // Handle mission items for waypoint list
    // This would be called when reading waypoints from vehicle
  }

  private decodeFlightMode(customMode: number, autopilot: number): string {
    // ArduPilot flight modes for multicopter
    const ardupilotModes: { [key: number]: string } = {
      0: "STABILIZE",
      1: "ACRO",
      2: "ALT_HOLD",
      3: "AUTO",
      4: "GUIDED",
      5: "LOITER",
      6: "RTL",
      7: "CIRCLE",
      9: "LAND",
      11: "DRIFT",
      13: "SPORT",
      14: "FLIP",
      15: "AUTOTUNE",
      16: "POSHOLD",
      17: "BRAKE",
      18: "THROW",
      19: "AVOID_ADSB",
      20: "GUIDED_NOGPS",
      21: "SMART_RTL",
      22: "FLOWHOLD",
      23: "FOLLOW",
      24: "ZIGZAG",
      25: "SYSTEMID",
      26: "AUTOROTATE",
      27: "AUTO_RTL",
    }

    return ardupilotModes[customMode] || `UNKNOWN(${customMode})`
  }

  // Command methods
  sendCommand(command: string, params: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ command, params }))
    }
  }

  armDisarm(arm: boolean) {
    this.sendCommand("ARM_DISARM", { arm })
  }

  setMode(mode: string) {
    this.sendCommand("SET_MODE", { mode })
  }

  takeoff(altitude: number) {
    this.sendCommand("TAKEOFF", { altitude })
  }

  rtl() {
    this.sendCommand("RTL")
  }

  setGuidedTarget(lat: number, lon: number, alt: number) {
    this.sendCommand("SET_GUIDED_TARGET", { lat, lon, alt })
  }

  uploadWaypoints(waypoints: Waypoint[]) {
    this.sendCommand("UPLOAD_WAYPOINTS", { waypoints })
  }

  downloadWaypoints() {
    this.sendCommand("DOWNLOAD_WAYPOINTS")
  }

  clearWaypoints() {
    this.sendCommand("CLEAR_WAYPOINTS")
  }

  startMission() {
    this.sendCommand("START_MISSION")
  }

  pauseMission() {
    this.sendCommand("PAUSE_MISSION")
  }

  resumeMission() {
    this.sendCommand("RESUME_MISSION")
  }

  // Event handlers
  onTelemetry(callback: (data: TelemetryData) => void) {
    this.onTelemetryUpdate = callback
  }

  onConnection(callback: (connected: boolean, port?: string, baudRate?: string) => void) {
    this.onConnectionChange = callback
  }

  onWaypoints(callback: (waypoints: Waypoint[]) => void) {
    this.onWaypointsUpdate = callback
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  getTelemetryData(): TelemetryData {
    return this.telemetryData
  }

  requestDataStreams() {
    console.log("Requesting MAVLink data streams...")
    // Remove the setInterval that sends fake data
    // Only send actual MAVLink REQUEST_DATA_STREAM messages
  }
}
