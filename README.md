# R-Nexus Ground Control Station

A production-level Ground Control Station (GCS) for multicopter UAVs with real MAVLink telemetry integration.

## 🚁 Features

- **Real MAVLink Integration**: Connects to SiK Radio telemetry modules via serial/USB
- **Live Telemetry**: Real-time display of battery, GPS, altitude, speed, and system status
- **Mission Planning**: Interactive map with waypoint management
- **Flight Control**: ARM/DISARM, mode changes, takeoff, RTL, guided flight
- **Mission Planner-like Interface**: Familiar UI for experienced operators
- **Professional Design**: Clean, responsive interface with dark/light modes
- **Safety Systems**: Pre-flight checklist, emergency stop, safety monitoring

## 🛡️ Safety Features

### Critical Safety Systems
- **Pre-Flight Checklist** - Automatic and manual safety checks
- **Emergency Stop** - Immediate motor disarm with confirmation dialog
- **Safety Monitor** - Real-time monitoring of critical flight parameters
- **Connection Monitoring** - Automatic detection of telemetry link status
- **Battery Warnings** - Low battery alerts and automatic RTL triggers
- **GPS Monitoring** - GPS fix quality and satellite count tracking

### Flight Safety Limits
- **Altitude Limits** - Configurable maximum altitude enforcement
- **Speed Limits** - Ground speed monitoring and warnings
- **Geofencing** - Virtual boundaries to prevent flyaways
- **RC Link Monitoring** - Radio control signal strength tracking

## 🔧 Setup Instructions

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Start MAVLink Server

The MAVLink server handles serial communication with the SiK Radio module:

\`\`\`bash
npm run mavlink-server
\`\`\`

This will:
- Scan for connected SiK Radio modules
- Establish MAVLink connection
- Parse telemetry data
- Provide WebSocket interface for the frontend

### 3. Start Frontend

In a separate terminal:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔌 Hardware Requirements

### SiK Radio Telemetry Module
- **Supported Models**: 3DR Radio, RFD900, HopeRF modules
- **Connection**: USB or Serial (FTDI/Silicon Labs chipset)
- **Baud Rate**: 57600 (default) or 115200
- **Range**: Up to 40km (depending on module and antenna)

### UAV Requirements
- **Autopilot**: ArduPilot (ArduCopter)
- **Vehicle Type**: Multicopter (Quadcopter, Hexacopter, Octocopter)
- **Telemetry**: SiK Radio or compatible 915MHz/433MHz module
- **GPS**: Required for position data and waypoint navigation

## 🎮 Usage

### Connection
1. Connect SiK Radio to computer via USB
2. Start MAVLink server (`npm run mavlink-server`)
3. Server will auto-detect the radio and establish connection
4. Launch frontend and navigate to Flight Data page

### Pre-Flight Procedures
1. **Complete Pre-Flight Checklist** - Verify all automatic and manual checks
2. **Monitor Safety Status** - Ensure all critical systems are operational
3. **Check Battery Level** - Verify sufficient charge for planned mission
4. **Verify GPS Fix** - Ensure 3D GPS lock with adequate satellite count
5. **Test RC Link** - Confirm strong radio control signal

### Flight Operations
- **ARM/DISARM**: Use ARM button in Mission Control panel (only after safety checks)
- **Mode Changes**: Select from dropdown (STABILIZE, ALT_HOLD, LOITER, AUTO, RTL, etc.)
- **Takeoff**: Set GUIDED mode and use takeoff command
- **Waypoint Navigation**: Upload mission and use AUTO mode
- **Emergency**: RTL button for immediate return to launch
- **EMERGENCY STOP**: Red emergency button for immediate motor disarm

### Map Interaction
- **Right-click**: Context menu with "Fly to Here", "Loiter Here", "RTL"
- **Left-click**: Select waypoints or close menus
- **Follow Drone**: Toggle to keep UAV centered on map

## 📊 Telemetry Data

The system displays real-time:
- **Battery**: Voltage, current, percentage remaining
- **GPS**: Fix type, satellite count, HDOP accuracy
- **Position**: Latitude, longitude, altitude (AMSL/Relative)
- **Velocity**: Ground speed, air speed, vertical speed
- **Attitude**: Roll, pitch, yaw angles
- **System**: CPU load, communication errors, RC signal strength

## ⚠️ Safety Warnings

### CRITICAL SAFETY NOTICES

1. **Always complete pre-flight checklist** before arming motors
2. **Never fly without GPS lock** - Ensure 3D fix with 8+ satellites
3. **Monitor battery levels** - Land immediately when low battery warning appears
4. **Maintain visual line of sight** with UAV at all times
5. **Emergency stop will cause UAV to fall** - Use only in genuine emergencies
6. **Check local regulations** before flight operations
7. **Ensure adequate RC signal strength** before takeoff

### Emergency Procedures
- **Lost RC Link**: UAV will automatically RTL if configured
- **Low Battery**: Automatic RTL trigger at configurable threshold
- **GPS Loss**: Switch to STABILIZE mode and land immediately
- **Emergency Stop**: Use red emergency button only if UAV poses immediate danger

## 🔧 Development

### Project Structure
\`\`\`
├── app/                    # Next.js app router pages
├── components/            # React components
├── lib/                   # MAVLink integration and utilities
├── hooks/                 # Custom React hooks
├── scripts/               # MAVLink server (Node.js)
└── public/                # Static assets
\`\`\`

### MAVLink Integration
- **Parser**: Custom MAVLink message parser
- **Commands**: ARM/DISARM, mode changes, waypoint upload/download
- **Telemetry**: Real-time data streaming via WebSocket
- **Error Handling**: Connection monitoring and auto-reconnect

## 🚨 Troubleshooting

### No MAVLink Connection
1. Check SiK Radio USB connection
2. Verify correct COM port/device path
3. Ensure MAVLink server is running
4. Check baud rate settings (57600 default)

### GPS Issues
- Wait for 3D GPS fix before flight operations
- Check antenna connection and placement
- Verify GPS module is functioning on UAV

### Telemetry Dropouts
- Check radio signal strength (RSSI)
- Verify antenna orientation and range
- Check for interference sources

### Safety System Alerts
- **Never ignore safety warnings**
- Complete all required pre-flight checks
- Resolve all critical issues before arming
- Monitor safety status throughout flight

## 📋 Production Deployment

For production use:
1. Build optimized frontend: `npm run build`
2. Deploy MAVLink server as system service
3. Configure firewall for WebSocket port (8080)
4. Set up SSL/TLS for secure connections
5. Implement user authentication if required
6. Configure automatic safety backups

## 📄 License

Proprietary software for R-Nexus UAV systems.

---

**⚠️ IMPORTANT SAFETY NOTICE**: This software controls real aircraft. Always follow proper safety procedures, complete pre-flight checks, and comply with local aviation regulations. The developers are not responsible for accidents or damage resulting from improper use.
