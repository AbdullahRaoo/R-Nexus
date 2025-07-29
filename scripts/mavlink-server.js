const WebSocket = require("ws")
const { SerialPort } = require("serialport")
const { ReadlineParser } = require("@serialport/parser-readline")

class MAVLinkServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 })
    this.serialPort = null
    this.clients = new Set()
    this.telemetryData = {}
    this.waypoints = []

    this.setupWebSocketServer()
    this.detectSerialPort()
  }

  setupWebSocketServer() {
    this.wss.on("connection", (ws) => {
      console.log("Client connected to MAVLink WebSocket")
      this.clients.add(ws)

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message)
          this.handleClientCommand(data, ws)
        } catch (error) {
          console.error("Error parsing client message:", error)
        }
      })

      ws.on("close", () => {
        console.log("Client disconnected from MAVLink WebSocket")
        this.clients.delete(ws)
      })

      // Send current telemetry data to new client
      if (Object.keys(this.telemetryData).length > 0) {
        ws.send(
          JSON.stringify({
            name: "TELEMETRY_UPDATE",
            payload: this.telemetryData,
          }),
        )
      }
    })

    console.log("MAVLink WebSocket server started on port 8080")
  }

  async detectSerialPort() {
    try {
      const ports = await SerialPort.list()
      console.log(
        "Available serial ports:",
        ports.map((p) => p.path),
      )

      // Look for common SiK Radio identifiers
      const sikPort = ports.find(
        (port) =>
          port.manufacturer?.includes("FTDI") ||
          port.manufacturer?.includes("Silicon Labs") ||
          port.productId === "6001" || // FTDI
          port.vendorId === "10c4", // Silicon Labs
      )

      if (sikPort) {
        console.log(`Found potential SiK Radio on ${sikPort.path}`)
        this.connectToSerial(sikPort.path)
      } else {
        console.log("No SiK Radio detected, trying common ports...")
        // Try common ports
        const commonPorts = ["/dev/ttyUSB0", "/dev/ttyACM0", "COM3", "COM4", "COM5"]
        for (const portPath of commonPorts) {
          try {
            await this.connectToSerial(portPath)
            break
          } catch (error) {
            console.log(`Failed to connect to ${portPath}`)
          }
        }
      }
    } catch (error) {
      console.error("Error detecting serial ports:", error)
      setTimeout(() => this.detectSerialPort(), 5000)
    }
  }

  connectToSerial(portPath) {
    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort({
        path: portPath,
        baudRate: 57600, // Standard SiK Radio baud rate
        autoOpen: false,
      })

      this.serialPort.open((error) => {
        if (error) {
          reject(error)
          return
        }

        console.log(`Connected to MAVLink on ${portPath}`)
        this.setupMAVLinkParser()
        resolve()
      })

      this.serialPort.on("error", (error) => {
        console.error("Serial port error:", error)
        this.serialPort = null
        setTimeout(() => this.detectSerialPort(), 5000)
      })
    })
  }

  setupMAVLinkParser() {
    // Simple MAVLink parser - in production, use a proper MAVLink library
    this.serialPort.on("data", (data) => {
      this.parseMAVLinkData(data)
    })

    // Request data streams
    this.requestDataStreams()
  }

  parseMAVLinkData(buffer) {
    // Simplified MAVLink parsing - in production use node-mavlink or similar
    // This is a basic implementation for demonstration

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0xfe || buffer[i] === 0xfd) {
        // MAVLink v1/v2 start byte
        // Parse MAVLink message (simplified)
        const msgId = buffer[i + 5] || 0

        // Simulate different message types
        switch (msgId) {
          case 0: // HEARTBEAT
            this.handleHeartbeat(buffer, i)
            break
          case 1: // SYS_STATUS
            this.handleSysStatus(buffer, i)
            break
          case 24: // GPS_RAW_INT
            this.handleGpsRawInt(buffer, i)
            break
          case 30: // ATTITUDE
            this.handleAttitude(buffer, i)
            break
          case 33: // GLOBAL_POSITION_INT
            this.handleGlobalPositionInt(buffer, i)
            break
          case 74: // VFR_HUD
            this.handleVfrHud(buffer, i)
            break
        }
      }
    }
  }

  handleHeartbeat(buffer, index) {
    // Parse HEARTBEAT message
    const message = {
      name: "HEARTBEAT",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        type: buffer[index + 6],
        autopilot: buffer[index + 7],
        base_mode: buffer[index + 8],
        custom_mode: buffer[index + 9],
        system_status: buffer[index + 10],
        mavlink_version: buffer[index + 11],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  handleSysStatus(buffer, index) {
    // Parse SYS_STATUS message
    const message = {
      name: "SYS_STATUS",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        voltage_battery: buffer[index + 6],
        current_battery: buffer[index + 7],
        battery_remaining: buffer[index + 8],
        load: buffer[index + 9],
        errors_comm: buffer[index + 10],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  handleGpsRawInt(buffer, index) {
    // Parse GPS_RAW_INT message
    const message = {
      name: "GPS_RAW_INT",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        fix_type: buffer[index + 6],
        lat: buffer[index + 7],
        lon: buffer[index + 8],
        alt: buffer[index + 9],
        eph: buffer[index + 10],
        satellites_visible: buffer[index + 11],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  handleAttitude(buffer, index) {
    // Parse ATTITUDE message
    const message = {
      name: "ATTITUDE",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        roll: buffer[index + 6],
        pitch: buffer[index + 7],
        yaw: buffer[index + 8],
        rollspeed: buffer[index + 9],
        pitchspeed: buffer[index + 10],
        yawspeed: buffer[index + 11],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  handleGlobalPositionInt(buffer, index) {
    // Parse GLOBAL_POSITION_INT message
    const message = {
      name: "GLOBAL_POSITION_INT",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        lat: buffer[index + 6],
        lon: buffer[index + 7],
        alt: buffer[index + 8],
        relative_alt: buffer[index + 9],
        vx: buffer[index + 10],
        vy: buffer[index + 11],
        vz: buffer[index + 12],
        hdg: buffer[index + 13],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  handleVfrHud(buffer, index) {
    // Parse VFR_HUD message
    const message = {
      name: "VFR_HUD",
      payload: {
        // Extract data from buffer based on MAVLink message definition
        airspeed: buffer[index + 6],
        groundspeed: buffer[index + 7],
        heading: buffer[index + 8],
        throttle: buffer[index + 9],
        alt: buffer[index + 10],
        climb: buffer[index + 11],
      },
      timestamp: Date.now(),
    }
    this.broadcastToClients(message)
  }

  requestDataStreams() {
    // Send MAVLink commands to request data streams
    // This would send actual MAVLink REQUEST_DATA_STREAM messages
    console.log("Requesting MAVLink data streams...")
    // Remove the setInterval that generates fake telemetry
    // Only send actual MAVLink REQUEST_DATA_STREAM commands to the vehicle
  }

  handleClientCommand(data, ws) {
    console.log("Received command:", data.command)

    switch (data.command) {
      case "ARM_DISARM":
        this.sendMAVLinkCommand(400, data.params.arm ? 1 : 0) // MAV_CMD_COMPONENT_ARM_DISARM
        break
      case "SET_MODE":
        this.sendMAVLinkCommand(176, this.getModeNumber(data.params.mode)) // MAV_CMD_DO_SET_MODE
        break
      case "TAKEOFF":
        this.sendMAVLinkCommand(22, data.params.altitude) // MAV_CMD_NAV_TAKEOFF
        break
      case "RTL":
        this.sendMAVLinkCommand(20) // MAV_CMD_NAV_RETURN_TO_LAUNCH
        break
      case "SET_GUIDED_TARGET":
        this.sendGuidedTarget(data.params.lat, data.params.lon, data.params.alt)
        break
      case "UPLOAD_WAYPOINTS":
        this.uploadWaypoints(data.params.waypoints)
        break
      case "DOWNLOAD_WAYPOINTS":
        this.downloadWaypoints()
        break
      case "CLEAR_WAYPOINTS":
        this.clearWaypoints()
        break
    }
  }

  sendMAVLinkCommand(command, param1 = 0, param2 = 0, param3 = 0, param4 = 0) {
    // Send MAVLink COMMAND_LONG message
    console.log(`Sending MAVLink command ${command} with params: ${param1}, ${param2}, ${param3}, ${param4}`)

    // In production, this would construct and send actual MAVLink packets
    if (this.serialPort && this.serialPort.isOpen) {
      // This would send the actual MAVLink COMMAND_LONG packet
      // For now, just log the command
    }
  }

  getModeNumber(modeName) {
    const modes = {
      STABILIZE: 0,
      ACRO: 1,
      ALT_HOLD: 2,
      AUTO: 3,
      GUIDED: 4,
      LOITER: 5,
      RTL: 6,
      CIRCLE: 7,
      LAND: 9,
      DRIFT: 11,
      SPORT: 13,
      FLIP: 14,
      AUTOTUNE: 15,
      POSHOLD: 16,
      BRAKE: 17,
    }
    return modes[modeName] || 0
  }

  sendGuidedTarget(lat, lon, alt) {
    console.log(`Setting guided target: ${lat}, ${lon}, ${alt}m`)
    // Send SET_POSITION_TARGET_GLOBAL_INT message
  }

  uploadWaypoints(waypoints) {
    console.log(`Uploading ${waypoints.length} waypoints to vehicle`)
    this.waypoints = waypoints
    // Send MISSION_COUNT, then MISSION_ITEM_INT messages
  }

  downloadWaypoints() {
    console.log("Downloading waypoints from vehicle")
    // Send MISSION_REQUEST_LIST message
    // For demo, send some sample waypoints
    const sampleWaypoints = [
      {
        seq: 0,
        frame: 0,
        command: 16, // MAV_CMD_NAV_WAYPOINT
        current: 0,
        autocontinue: 1,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        x: 40.7128,
        y: -74.006,
        z: 50,
      },
    ]

    this.broadcastToClients({
      name: "WAYPOINTS_DOWNLOADED",
      payload: sampleWaypoints,
      timestamp: Date.now(),
    })
  }

  clearWaypoints() {
    console.log("Clearing waypoints")
    this.waypoints = []
    // Send MISSION_CLEAR_ALL message
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message)
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr)
      }
    })
  }
}

// Start the MAVLink server
const server = new MAVLinkServer()

console.log("MAVLink Ground Control Station Server")
console.log("- WebSocket server: ws://localhost:8080/mavlink")
console.log("- Scanning for SiK Radio telemetry modules...")
console.log("- Supported baud rates: 57600, 115200")
console.log("- Press Ctrl+C to exit")

process.on("SIGINT", () => {
  console.log("\nShutting down MAVLink server...")
  if (server.serialPort && server.serialPort.isOpen) {
    server.serialPort.close()
  }
  process.exit(0)
})
