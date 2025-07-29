export interface MAVLinkMessage {
  msgid: number
  name: string
  payload: any
  timestamp: number
}

export interface HeartbeatMessage {
  type: number
  autopilot: number
  base_mode: number
  custom_mode: number
  system_status: number
  mavlink_version: number
}

export interface AttitudeMessage {
  time_boot_ms: number
  roll: number
  pitch: number
  yaw: number
  rollspeed: number
  pitchspeed: number
  yawspeed: number
}

export interface GlobalPositionIntMessage {
  time_boot_ms: number
  lat: number
  lon: number
  alt: number
  relative_alt: number
  vx: number
  vy: number
  vz: number
  hdg: number
}

export interface SysStatusMessage {
  onboard_control_sensors_present: number
  onboard_control_sensors_enabled: number
  onboard_control_sensors_health: number
  load: number
  voltage_battery: number
  current_battery: number
  battery_remaining: number
  drop_rate_comm: number
  errors_comm: number
  errors_count1: number
  errors_count2: number
  errors_count3: number
  errors_count4: number
}

export interface GpsRawIntMessage {
  time_usec: number
  fix_type: number
  lat: number
  lon: number
  alt: number
  eph: number
  epv: number
  vel: number
  cog: number
  satellites_visible: number
}

export interface MissionCurrentMessage {
  seq: number
}

export interface VfrHudMessage {
  airspeed: number
  groundspeed: number
  heading: number
  throttle: number
  alt: number
  climb: number
}

export interface RcChannelsMessage {
  time_boot_ms: number
  chancount: number
  chan1_raw: number
  chan2_raw: number
  chan3_raw: number
  chan4_raw: number
  chan5_raw: number
  chan6_raw: number
  chan7_raw: number
  chan8_raw: number
  rssi: number
}

export interface TelemetryData {
  connected: boolean
  armed: boolean
  mode: string
  battery: {
    voltage: number
    current: number
    percentage: number
  }
  gps: {
    fix_type: number
    satellites: number
    hdop: number
    lat: number
    lon: number
  }
  position: {
    lat: number
    lon: number
    alt_amsl: number
    alt_rel: number
    heading: number
  }
  velocity: {
    ground_speed: number
    air_speed: number
    vertical_speed: number
  }
  attitude: {
    roll: number
    pitch: number
    yaw: number
  }
  rc: {
    rssi: number
    channels: number[]
  }
  system: {
    load: number
    errors: number
    status: number
  }
  mission: {
    current_wp: number
    total_wp: number
  }
  last_heartbeat: number
}

export interface Waypoint {
  seq: number
  frame: number
  command: number
  current: number
  autocontinue: number
  param1: number
  param2: number
  param3: number
  param4: number
  x: number
  y: number
  z: number
}
