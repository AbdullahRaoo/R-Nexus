import { useCallback } from 'react'

// MAVLink command constants
export const MAV_CMD = {
  WAYPOINT: 16,
  LOITER_UNLIM: 17,
  LOITER_TURNS: 18,
  LOITER_TIME: 19,
  RETURN_TO_LAUNCH: 20,
  LAND: 21,
  TAKEOFF: 22,
  SPLINE_WAYPOINT: 82,
  CONDITION_DELAY: 112,
  DO_JUMP: 177,
  DO_SET_ROI: 201,
  DO_MOUNT_CONTROL: 205,
  // Add more commands as needed
} as const

export const MAV_FRAME = {
  GLOBAL: 0,
  LOCAL_NED: 1,
  MISSION: 2,
  GLOBAL_RELATIVE_ALT: 3,
  LOCAL_ENU: 4,
  GLOBAL_INT: 5,
  GLOBAL_RELATIVE_ALT_INT: 6,
  LOCAL_OFFSET_NED: 7,
  BODY_NED: 8,
  BODY_OFFSET_NED: 9,
  GLOBAL_TERRAIN_ALT: 10,
  GLOBAL_TERRAIN_ALT_INT: 11,
} as const

export const MAV_MODE_FLAG = {
  SAFETY_ARMED: 128,
  MANUAL_INPUT_ENABLED: 64,
  HIL_ENABLED: 32,
  STABILIZE_ENABLED: 16,
  GUIDED_ENABLED: 8,
  AUTO_ENABLED: 4,
  TEST_ENABLED: 2,
  CUSTOM_MODE_ENABLED: 1,
} as const

export interface MAVLinkCommand {
  target_system: number
  target_component: number
  command: number
  confirmation: number
  param1: number
  param2: number
  param3: number
  param4: number
  param5: number
  param6: number
  param7: number
}

export interface GuidedModeTarget {
  target_system: number
  target_component: number
  lat: number
  lon: number
  alt: number
}

export interface FlightMode {
  base_mode: number
  custom_mode: number
}

export const useMavlinkCommands = () => {
  
  // Send command to set guided mode waypoint
  const sendGuidedWaypoint = useCallback(async (lat: number, lon: number, alt: number) => {
    const command: GuidedModeTarget = {
      target_system: 1, // System ID of the UAV
      target_component: 1, // Component ID (autopilot)
      lat: lat * 1e7, // Convert to int32 (degrees * 1e7)
      lon: lon * 1e7,
      alt: alt * 1000, // Convert to mm
    }
    
    console.log('Sending guided waypoint:', command)
    // TODO: Implement actual MAVLink transmission
    // This would typically use WebSocket or SerialPort to send the command
    
    return Promise.resolve(true)
  }, [])

  // Send loiter command
  const sendLoiterCommand = useCallback(async (lat: number, lon: number, alt: number, unlimited = true) => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: unlimited ? MAV_CMD.LOITER_UNLIM : MAV_CMD.LOITER_TIME,
      confirmation: 0,
      param1: unlimited ? 0 : 60, // Time in seconds (if not unlimited)
      param2: 0, // Empty
      param3: 5, // Radius in meters
      param4: 0, // Desired yaw angle
      param5: lat,
      param6: lon,
      param7: alt,
    }
    
    console.log('Sending loiter command:', command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Set flight mode
  const setFlightMode = useCallback(async (mode: string) => {
    // ArduCopter flight mode mappings
    const flightModes: Record<string, number> = {
      'STABILIZE': 0,
      'ACRO': 1,
      'ALT_HOLD': 2,
      'AUTO': 3,
      'GUIDED': 4,
      'LOITER': 5,
      'RTL': 6,
      'CIRCLE': 7,
      'LAND': 9,
      'BRAKE': 17,
      'THROW': 18,
      'POSHOLD': 16,
    }
    
    const customMode = flightModes[mode.toUpperCase()]
    if (customMode === undefined) {
      console.error(`Unknown flight mode: ${mode}`)
      return Promise.resolve(false)
    }
    
    const flightMode: FlightMode = {
      base_mode: MAV_MODE_FLAG.CUSTOM_MODE_ENABLED,
      custom_mode: customMode,
    }
    
    console.log(`Setting flight mode to ${mode} (${customMode}):`, flightMode)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Arm/Disarm motors
  const setArmed = useCallback(async (armed: boolean) => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: 400, // MAV_CMD_COMPONENT_ARM_DISARM
      confirmation: 0,
      param1: armed ? 1 : 0, // 1 to arm, 0 to disarm
      param2: 0, // Force arming/disarming (0 = normal, 21196 = force)
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
    }
    
    console.log(`${armed ? 'Arming' : 'Disarming'} motors:`, command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Takeoff command
  const sendTakeoffCommand = useCallback(async (alt: number) => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: MAV_CMD.TAKEOFF,
      confirmation: 0,
      param1: 0, // Minimum pitch
      param2: 0, // Empty
      param3: 0, // Empty
      param4: 0, // Yaw angle
      param5: 0, // Latitude (0 for current location)
      param6: 0, // Longitude (0 for current location)
      param7: alt, // Altitude
    }
    
    console.log('Sending takeoff command:', command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Set home position
  const setHomePosition = useCallback(async (lat: number, lon: number, alt: number) => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: 179, // MAV_CMD_DO_SET_HOME
      confirmation: 0,
      param1: 0, // Use specified location (not current location)
      param2: 0, // Empty
      param3: 0, // Empty
      param4: 0, // Empty
      param5: lat,
      param6: lon,
      param7: alt,
    }
    
    console.log('Setting home position:', command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Emergency stop
  const emergencyStop = useCallback(async () => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: 400, // MAV_CMD_COMPONENT_ARM_DISARM
      confirmation: 0,
      param1: 0, // Disarm
      param2: 21196, // Force disarm (emergency)
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
    }
    
    console.log('EMERGENCY STOP - Force disarming:', command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  // Gimbal control
  const controlGimbal = useCallback(async (pitch: number, yaw: number, roll: number) => {
    const command: MAVLinkCommand = {
      target_system: 1,
      target_component: 1,
      command: MAV_CMD.DO_MOUNT_CONTROL,
      confirmation: 0,
      param1: pitch, // Pitch angle in degrees
      param2: roll,  // Roll angle in degrees
      param3: yaw,   // Yaw angle in degrees
      param4: 0,     // Empty
      param5: 0,     // Empty
      param6: 0,     // Empty
      param7: 2,     // Mount mode (2 = MAV_MOUNT_MODE_MAVLINK_TARGETING)
    }
    
    console.log('Controlling gimbal:', command)
    // TODO: Implement actual MAVLink transmission
    
    return Promise.resolve(true)
  }, [])

  return {
    sendGuidedWaypoint,
    sendLoiterCommand,
    setFlightMode,
    setArmed,
    sendTakeoffCommand,
    setHomePosition,
    emergencyStop,
    controlGimbal,
  }
}
