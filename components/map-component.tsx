"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback, Fragment } from "react"
import type { TelemetryData, Waypoint } from "@/lib/mavlink-types"
import { useMavlinkCommands } from "@/hooks/use-mavlink-commands"

interface MapComponentProps {
  telemetry: TelemetryData | null
  waypoints: Waypoint[]
  onMapRightClick: (lat: number, lon: number, x: number, y: number) => void
  onMapClick: () => void
  onWaypointClick: (waypoint: Waypoint) => void
  followDrone: boolean
  connected: boolean
}

type MapProvider = "google_satellite" | "google_hybrid" | "google_terrain" | "bing_satellite" | "bing_hybrid" | "osm"

interface ContextMenuOption {
  label: string
  action: string
  icon?: string
  submenu?: ContextMenuOption[]
  disabled?: boolean
  separator?: boolean
}

// MAVLink command constants (matching ArduPilot/Mission Planner)
const MAV_CMD = {
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
} as const

// MAVLink frame constants
const MAV_FRAME = {
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

export function MapComponent({
  telemetry,
  waypoints,
  onMapRightClick,
  onMapClick,
  onWaypointClick,
  followDrone,
  connected,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lon: -74.006 })
  const [mapZoom, setMapZoom] = useState(15)
  const [mapProvider, setMapProvider] = useState<MapProvider>("google_satellite")
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    lat: number
    lon: number
    visible: boolean
  } | null>(null)
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    visible: boolean
  } | null>(null)
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const lastDrawTime = useRef<number>(0)

  // MAVLink commands hook
  const {
    sendGuidedWaypoint,
    sendLoiterCommand,
    setFlightMode,
    setArmed,
    sendTakeoffCommand,
    setHomePosition,
    emergencyStop,
    controlGimbal,
  } = useMavlinkCommands()

  // Notification helper
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true })
    setTimeout(() => {
      setNotification(null)
    }, 3000)
  }

  // Mission Planner's complete right-click context menu for multirotors
  const getContextMenuOptions = (lat: number, lon: number): ContextMenuOption[] => [
    {
      label: "Fly to Here",
      action: "fly_to_here",
      icon: "🎯",
      disabled: !connected || !telemetry?.armed,
    },
    {
      label: "Loiter Here",
      action: "loiter_here",
      icon: "🔄",
      disabled: !connected,
    },
    {
      label: "Loiter Unlimited",
      action: "loiter_unlimited",
      icon: "♾️",
      disabled: !connected,
    },
    { separator: true, label: "", action: "" },
    {
      label: "Set Home Here",
      action: "set_home_here",
      icon: "🏠",
      disabled: !connected,
    },
    {
      label: "Set Rally Point",
      action: "set_rally_point",
      icon: "🚩",
      disabled: !connected,
    },
    { separator: true, label: "", action: "" },
    {
      label: "Add Waypoint",
      action: "add_waypoint",
      icon: "📍",
      submenu: [
        { label: "Waypoint", action: "add_waypoint_nav", icon: "📍" },
        { label: "Spline Waypoint", action: "add_waypoint_spline", icon: "〰️" },
        { label: "Takeoff", action: "add_takeoff", icon: "🛫" },
        { label: "Land", action: "add_land", icon: "🛬" },
        { label: "RTL", action: "add_rtl", icon: "🏠" },
        { label: "Loiter Unlimited", action: "add_loiter_unlim", icon: "♾️" },
        { label: "Loiter Turns", action: "add_loiter_turns", icon: "🔄" },
        { label: "Loiter Time", action: "add_loiter_time", icon: "⏱️" },
        { label: "Condition Delay", action: "add_condition_delay", icon: "⏸️" },
        { label: "Do Jump", action: "add_do_jump", icon: "↩️" },
        { label: "Set ROI", action: "add_set_roi", icon: "📷" },
        { label: "Mount Control", action: "add_mount_control", icon: "📹" },
      ],
    },
    {
      label: "Delete Waypoint",
      action: "delete_waypoint",
      icon: "🗑️",
      disabled: waypoints.length <= 1,
    },
    { separator: true, label: "", action: "" },
    {
      label: "Flight Modes",
      action: "flight_modes",
      icon: "✈️",
      submenu: [
        { label: "Stabilize", action: "mode_stabilize", icon: "⚖️" },
        { label: "Alt Hold", action: "mode_alt_hold", icon: "📏" },
        { label: "Loiter", action: "mode_loiter", icon: "🔄" },
        { label: "Auto", action: "mode_auto", icon: "🤖" },
        { label: "Guided", action: "mode_guided", icon: "🎯" },
        { label: "RTL", action: "mode_rtl", icon: "🏠" },
        { label: "Land", action: "mode_land", icon: "🛬" },
        { label: "Brake", action: "mode_brake", icon: "🛑" },
        { label: "Throw", action: "mode_throw", icon: "🤾" },
        { label: "PosHold", action: "mode_poshold", icon: "📍" },
      ],
      disabled: !connected,
    },
    {
      label: "Gimbal Control",
      action: "gimbal_control",
      icon: "📹",
      submenu: [
        { label: "Point Here", action: "gimbal_point_here", icon: "🎯" },
        { label: "Center", action: "gimbal_center", icon: "⚪" },
        { label: "Manual Control", action: "gimbal_manual", icon: "🎮" },
        { label: "Follow GPS", action: "gimbal_follow_gps", icon: "📡" },
      ],
      disabled: !connected,
    },
    { separator: true, label: "", action: "" },
    {
      label: "Survey Grid",
      action: "survey_grid",
      icon: "🗂️",
      submenu: [
        { label: "Create Grid", action: "create_survey_grid", icon: "⊞" },
        { label: "Polygon Survey", action: "polygon_survey", icon: "⬟" },
        { label: "Corridor Scan", action: "corridor_scan", icon: "🛤️" },
      ],
    },
    {
      label: "Geofence",
      action: "geofence",
      icon: "🚧",
      submenu: [
        { label: "Add Inclusion Zone", action: "add_inclusion_fence", icon: "✅" },
        { label: "Add Exclusion Zone", action: "add_exclusion_fence", icon: "❌" },
        { label: "Clear Geofence", action: "clear_geofence", icon: "🗑️" },
      ],
    },
    { separator: true, label: "", action: "" },
    {
      label: "Preflight Actions",
      action: "preflight",
      icon: "🔧",
      submenu: [
        { label: "Arm Motors", action: "arm_motors", icon: "🔋", disabled: !connected || telemetry?.armed },
        { label: "Disarm Motors", action: "disarm_motors", icon: "🔌", disabled: !connected || !telemetry?.armed },
        { label: "Takeoff", action: "takeoff", icon: "🛫", disabled: !connected || !telemetry?.armed },
        { label: "Emergency Stop", action: "emergency_stop", icon: "🚨", disabled: !connected },
      ],
    },
    {
      label: "Clear Mission",
      action: "clear_mission",
      icon: "🗑️",
      disabled: waypoints.length <= 1,
    },
    { separator: true, label: "", action: "" },
    {
      label: "Map Options",
      action: "map_options",
      icon: "🗺️",
      submenu: [
        { label: "Zoom to Fit", action: "zoom_to_fit", icon: "🔍" },
        { label: "Center on Home", action: "center_home", icon: "🏠" },
        { label: "Center on UAV", action: "center_uav", icon: "✈️", disabled: !connected },
        { label: "Measure Distance", action: "measure_distance", icon: "📏" },
        { label: "Show Grid", action: "toggle_grid", icon: "⊞" },
      ],
    },
  ]

  // Optimized tile loading with proper Web Mercator projection
  const deg2rad = (deg: number) => (deg * Math.PI) / 180
  const rad2deg = (rad: number) => (rad * 180) / Math.PI

  const latLonToTileXY = (lat: number, lon: number, zoom: number) => {
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lon + 180) / 360) * n)
    const y = Math.floor(((1 - Math.asinh(Math.tan(deg2rad(lat))) / Math.PI) / 2) * n)
    return { x, y }
  }

  const tileXYToLatLon = (x: number, y: number, zoom: number) => {
    const n = Math.pow(2, zoom)
    const lon = (x / n) * 360 - 180
    const lat = rad2deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))))
    return { lat, lon }
  }

  const getMapTileUrl = (provider: MapProvider, x: number, y: number, zoom: number): string => {
    switch (provider) {
      case "google_satellite":
        return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${zoom}`
      case "google_hybrid":
        return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${zoom}`
      case "google_terrain":
        return `https://mt1.google.com/vt/lyrs=t&x=${x}&y=${y}&z=${zoom}`
      case "bing_satellite":
        return `https://ecn.t3.tiles.virtualearth.net/tiles/a${tileXYToQuadKey(x, y, zoom)}.jpeg?g=1`
      case "bing_hybrid":
        return `https://ecn.t3.tiles.virtualearth.net/tiles/h${tileXYToQuadKey(x, y, zoom)}.jpeg?g=1`
      case "osm":
        return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
      default:
        return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${zoom}`
    }
  }

  const tileXYToQuadKey = (tileX: number, tileY: number, levelOfDetail: number): string => {
    let quadKey = ""
    for (let i = levelOfDetail; i > 0; i--) {
      let digit = 0
      const mask = 1 << (i - 1)
      if ((tileX & mask) !== 0) digit++
      if ((tileY & mask) !== 0) digit += 2
      quadKey += digit.toString()
    }
    return quadKey
  }

  const latLonToPixel = useCallback(
    (lat: number, lon: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const scale = Math.pow(2, mapZoom)
      const worldX = ((lon + 180) / 360) * 256 * scale
      const worldY = ((1 - Math.asinh(Math.tan(deg2rad(lat))) / Math.PI) / 2) * 256 * scale

      const centerWorldX = ((mapCenter.lon + 180) / 360) * 256 * scale
      const centerWorldY = ((1 - Math.asinh(Math.tan(deg2rad(mapCenter.lat))) / Math.PI) / 2) * 256 * scale

      return {
        x: canvas.width / 2 + (worldX - centerWorldX),
        y: canvas.height / 2 + (worldY - centerWorldY),
      }
    },
    [mapCenter, mapZoom],
  )

  const pixelToLatLon = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { lat: 0, lon: 0 }

      const scale = Math.pow(2, mapZoom)
      const centerWorldX = ((mapCenter.lon + 180) / 360) * 256 * scale
      const centerWorldY = ((1 - Math.asinh(Math.tan(deg2rad(mapCenter.lat))) / Math.PI) / 2) * 256 * scale

      const worldX = centerWorldX + (x - canvas.width / 2)
      const worldY = centerWorldY + (y - canvas.height / 2)

      const lon = (worldX / (256 * scale)) * 360 - 180
      const n = Math.PI - (2 * Math.PI * worldY) / (256 * scale)
      const lat = rad2deg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))

      return { lat, lon }
    },
    [mapCenter, mapZoom],
  )

  // Optimized drawing with better performance and smoother updates
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    try {
      const tileSize = 256
      const tilesX = Math.ceil(canvas.width / tileSize) + 3
      const tilesY = Math.ceil(canvas.height / tileSize) + 3

      // Calculate center tile and offset
      const center = mapCenter
      const centerTile = latLonToTileXY(center.lat, center.lon, mapZoom)
      const centerTileX = centerTile.x
      const centerTileY = centerTile.y
      const centerPixel = latLonToPixel(center.lat, center.lon)
      const offsetX = centerPixel.x - canvas.width / 2
      const offsetY = centerPixel.y - canvas.height / 2

      // Draw tiles with precise positioning
      for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
        for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
          const tileX = centerTileX + dx
          const tileY = centerTileY + dy

          if (tileX < 0 || tileY < 0 || tileX >= Math.pow(2, mapZoom) || tileY >= Math.pow(2, mapZoom)) continue

          // Calculate precise pixel position
          const pixelX = Math.floor(canvas.width / 2 + dx * tileSize - offsetX)
          const pixelY = Math.floor(canvas.height / 2 + dy * tileSize - offsetY)

          // Skip tiles that are completely outside the view
          if (pixelX + tileSize < 0 || pixelX > canvas.width || 
              pixelY + tileSize < 0 || pixelY > canvas.height) continue

          const tileKey = `${mapProvider}-${mapZoom}-${tileX}-${tileY}`
          const cachedTile = tileCache.current.get(tileKey)

          if (cachedTile && cachedTile.complete && cachedTile.naturalWidth > 0) {
            try {
              ctx.drawImage(cachedTile, pixelX, pixelY, tileSize, tileSize)
            } catch (error) {
              console.warn(`Error drawing tile ${tileKey}:`, error)
              // Draw placeholder on error
              ctx.fillStyle = "#cbd5e1"
              ctx.fillRect(pixelX, pixelY, tileSize, tileSize)
            }
          } else {
            // Draw a subtle placeholder tile
            ctx.fillStyle = "#cbd5e1" // slate-300
            ctx.fillRect(pixelX, pixelY, tileSize, tileSize)
            ctx.strokeStyle = "#94a3b8" // slate-400
            ctx.lineWidth = 1
            ctx.strokeRect(pixelX, pixelY, tileSize, tileSize)
            
            // Load tile asynchronously only if not already loading
            if (!cachedTile) {
              loadTile(tileX, tileY, mapZoom, tileKey)
            }
          }
        }
      }

      drawOverlays(ctx)
    } catch (error) {
      console.error("Error in drawMap:", error)
      // If there's an error, just fill with background color to prevent white screen
      ctx.fillStyle = "#e2e8f0"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [mapCenter, mapZoom, mapProvider, telemetry, waypoints, connected])

  const loadTile = useCallback(async (tileX: number, tileY: number, zoom: number, tileKey: string) => {
    if (tileCache.current.has(tileKey)) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    // Create a placeholder to prevent multiple requests for the same tile
    tileCache.current.set(tileKey, img)

    img.onload = () => {
      // Verify the image loaded properly
      if (img.complete && img.naturalWidth > 0) {
        tileCache.current.set(tileKey, img)
        // Trigger immediate redraw for smooth tile loading
        drawMap()
      }
    }

    img.onerror = () => {
      console.warn(`Failed to load tile: ${tileKey}`)
      // Remove the failed tile from cache so it can be retried later
      tileCache.current.delete(tileKey)
    }

    try {
      img.src = getMapTileUrl(mapProvider, tileX, tileY, zoom)
    } catch (error) {
      console.warn(`Error setting tile source for ${tileKey}:`, error)
      tileCache.current.delete(tileKey)
    }
  }, [mapProvider, drawMap])

  const drawOverlays = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Draw coordinate grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Latitude lines
    for (let lat = Math.floor(mapCenter.lat) - 2; lat <= Math.ceil(mapCenter.lat) + 2; lat++) {
      const pos = latLonToPixel(lat, mapCenter.lon)
      if (pos.y >= 0 && pos.y <= canvas.height) {
        ctx.beginPath()
        ctx.moveTo(0, pos.y)
        ctx.lineTo(canvas.width, pos.y)
        ctx.stroke()
      }
    }

    // Longitude lines
    for (let lon = Math.floor(mapCenter.lon) - 2; lon <= Math.ceil(mapCenter.lon) + 2; lon++) {
      const pos = latLonToPixel(mapCenter.lat, lon)
      if (pos.x >= 0 && pos.x <= canvas.width) {
        ctx.beginPath()
        ctx.moveTo(pos.x, 0)
        ctx.lineTo(pos.x, canvas.height)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])

    // Draw home position
    if (waypoints.length > 0) {
      const homePos = latLonToPixel(waypoints[0].x, waypoints[0].y)
      ctx.fillStyle = "#16a34a"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(homePos.x, homePos.y, 12, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("H", homePos.x, homePos.y + 4)
    }

    // Draw flight path
    if (waypoints.length > 1) {
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      
      // Start from home waypoint
      const homePos = latLonToPixel(waypoints[0].x, waypoints[0].y)
      ctx.moveTo(homePos.x, homePos.y)
      
      // Draw lines to all waypoints in sequence
      for (let i = 1; i < waypoints.length; i++) {
        const pos = latLonToPixel(waypoints[i].x, waypoints[i].y)
        ctx.lineTo(pos.x, pos.y)
      }
      
      // Close the mission loop by connecting last waypoint back to home
      if (waypoints.length > 2) {
        ctx.strokeStyle = "#10b981" // Green for return path
        ctx.setLineDash([4, 8]) // Different dash pattern for return
        ctx.lineTo(homePos.x, homePos.y)
      }
      
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw waypoints
    waypoints.slice(1).forEach((waypoint) => {
      const pos = latLonToPixel(waypoint.x, waypoint.y)
      let fillColor = "#f59e0b"

      if (connected && telemetry) {
        if (waypoint.seq === telemetry.mission.current_wp) {
          fillColor = "#16a34a"
        } else if (waypoint.seq < telemetry.mission.current_wp) {
          fillColor = "#2563eb"
        }
      }

      ctx.fillStyle = fillColor
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = "white"
      ctx.font = "bold 11px Arial"
      ctx.textAlign = "center"
      ctx.fillText(waypoint.seq.toString(), pos.x, pos.y + 4)

      // Altitude display
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(pos.x - 20, pos.y - 35, 40, 16)
      ctx.fillStyle = "white"
      ctx.font = "10px Arial"
      ctx.fillText(`${waypoint.z.toFixed(0)}m`, pos.x, pos.y - 25)
    })

    // Draw UAV
    if (connected && telemetry && telemetry.gps.fix_type >= 2) {
      const uavPos = latLonToPixel(telemetry.position.lat, telemetry.position.lon)

      // UAV trail
      ctx.fillStyle = "rgba(220, 38, 38, 0.6)"
      ctx.beginPath()
      ctx.arc(uavPos.x, uavPos.y, 4, 0, 2 * Math.PI)
      ctx.fill()

      // UAV aircraft symbol
      ctx.save()
      ctx.translate(uavPos.x, uavPos.y)
      ctx.rotate((telemetry.position.heading * Math.PI) / 180)

      ctx.fillStyle = "#dc2626"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -12)
      ctx.lineTo(-8, 8)
      ctx.lineTo(-3, 8)
      ctx.lineTo(-3, 12)
      ctx.lineTo(3, 12)
      ctx.lineTo(3, 8)
      ctx.lineTo(8, 8)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // UAV info
      const infoText = `${telemetry.mode} | ${telemetry.position.alt_rel.toFixed(0)}m | ${telemetry.velocity.ground_speed.toFixed(1)}m/s`
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(uavPos.x - 60, uavPos.y - 45, 120, 20)
      ctx.fillStyle = "white"
      ctx.font = "11px Arial"
      ctx.textAlign = "center"
      ctx.fillText(infoText, uavPos.x, uavPos.y - 32)
    }

    // Draw crosshair
    if (crosshairPos) {
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(crosshairPos.x - 10, crosshairPos.y)
      ctx.lineTo(crosshairPos.x + 10, crosshairPos.y)
      ctx.moveTo(crosshairPos.x, crosshairPos.y - 10)
      ctx.lineTo(crosshairPos.x, crosshairPos.y + 10)
      ctx.stroke()
    }
  }

  // Event handlers
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      setCrosshairPos({ x, y })
    }
  }

  const handleRightClick = (event: React.MouseEvent) => {
    event.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const { lat, lon } = pixelToLatLon(x, y)

      // If Shift is held, add waypoint directly without context menu
      if (event.shiftKey) {
        addWaypoint(lat, lon, 10, "WAYPOINT")
        return
      }

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        lat,
        lon,
        visible: true,
      })
    }
  }

  const handleContextMenuAction = async (action: string) => {
    if (!contextMenu) return

    const lat = contextMenu.lat
    const lon = contextMenu.lon
    
    console.log(`Context menu action: ${action} at ${lat.toFixed(6)}, ${lon.toFixed(6)}`)

    // Handle actions based on Mission Planner functionality
    switch (action) {
      case "fly_to_here":
        if (connected && telemetry?.armed) {
          // Send guided mode waypoint to UAV for immediate navigation
          const altitude = telemetry.position.alt_rel || 10
          console.log(`Commanding drone to fly to: ${lat.toFixed(6)}, ${lon.toFixed(6)} at ${altitude}m`)
          sendGuidedWaypoint(lat, lon, altitude)
            .then(() => {
              console.log("Guided waypoint sent successfully")
            })
            .catch((error) => {
              console.error("Failed to send guided waypoint:", error)
            })
        } else {
          console.warn("Cannot fly to here - drone not connected or not armed")
        }
        break
        
      case "loiter_here":
        if (connected) {
          const altitude = telemetry?.position.alt_rel || 10
          console.log(`Commanding drone to loiter at: ${lat.toFixed(6)}, ${lon.toFixed(6)} at ${altitude}m`)
          sendLoiterCommand(lat, lon, altitude, false) // false = limited time loiter
            .then(() => {
              console.log("Loiter command sent successfully")
            })
            .catch((error) => {
              console.error("Failed to send loiter command:", error)
            })
        }
        break
        
      case "loiter_unlimited":
        if (connected) {
          const altitude = telemetry?.position.alt_rel || 10
          console.log(`Commanding drone to loiter unlimited at: ${lat.toFixed(6)}, ${lon.toFixed(6)} at ${altitude}m`)
          sendLoiterCommand(lat, lon, altitude, true) // true = unlimited loiter
            .then(() => {
              console.log("Loiter unlimited command sent successfully")
            })
            .catch((error) => {
              console.error("Failed to send loiter unlimited command:", error)
            })
        }
        break
        
      case "set_home_here":
        if (connected) {
          console.log(`Setting home position to: ${lat.toFixed(6)}, ${lon.toFixed(6)}`)
          setHomePosition(lat, lon, telemetry?.position.alt_rel || 0)
            .then(() => {
              console.log("Home position set successfully")
            })
            .catch((error) => {
              console.error("Failed to set home position:", error)
            })
        }
        break
        
      case "set_rally_point":
        if (connected) {
          console.log(`Setting rally point at: ${lat.toFixed(6)}, ${lon.toFixed(6)}`)
          // TODO: Implement MAVLink rally point command
        }
        break
        
      // Waypoint addition commands - these add to mission AND send to drone
      case "add_waypoint_nav":
        addWaypoint(lat, lon, 10, "WAYPOINT")
        break
        
      case "add_waypoint_spline":
        addWaypoint(lat, lon, 10, "SPLINE_WAYPOINT")
        break
        
      case "add_takeoff":
        addWaypoint(lat, lon, 10, "TAKEOFF")
        break
        
      case "add_land":
        addWaypoint(lat, lon, 0, "LAND")
        break
        
      case "add_rtl":
        addWaypoint(lat, lon, 0, "RETURN_TO_LAUNCH")
        break
        
      case "add_loiter_unlim":
        addWaypoint(lat, lon, 10, "LOITER_UNLIM")
        break
        
      case "add_loiter_turns":
        addWaypoint(lat, lon, 10, "LOITER_TURNS")
        break
        
      case "add_loiter_time":
        addWaypoint(lat, lon, 10, "LOITER_TIME")
        break
        
      case "add_condition_delay":
        addWaypoint(lat, lon, 0, "CONDITION_DELAY")
        break
        
      case "add_do_jump":
        addWaypoint(lat, lon, 0, "DO_JUMP")
        break
        
      case "add_set_roi":
        addWaypoint(lat, lon, 0, "DO_SET_ROI")
        break
        
      case "add_mount_control":
        addWaypoint(lat, lon, 0, "DO_MOUNT_CONTROL")
        break
        
      case "delete_waypoint":
        // Find closest waypoint to clicked location
        if (waypoints.length > 1) {
          let closestWaypoint: Waypoint | null = null
          let minDistance = Infinity
          
          waypoints.slice(1).forEach(wp => { // Skip home waypoint
            const pos = latLonToPixel(wp.x, wp.y)
            const clickPos = latLonToPixel(lat, lon)
            const distance = Math.sqrt(
              Math.pow(pos.x - clickPos.x, 2) + Math.pow(pos.y - clickPos.y, 2)
            )
            if (distance < minDistance && distance < 50) { // Within 50 pixels
              minDistance = distance
              closestWaypoint = wp
            }
          })
          
          if (closestWaypoint) {
            onMapRightClick(lat, lon, -1, (closestWaypoint as Waypoint).seq) // Special signal for deletion
            showNotification(`Deleted waypoint ${(closestWaypoint as Waypoint).seq}`, 'success')
          } else {
            showNotification("No waypoint found near click location", 'error')
          }
        }
        break
        
      // Flight mode changes
      case "mode_stabilize":
        if (connected) setFlightMode("STABILIZE")
        break
      case "mode_alt_hold":
        if (connected) setFlightMode("ALT_HOLD")
        break
      case "mode_loiter":
        if (connected) setFlightMode("LOITER")
        break
      case "mode_auto":
        if (connected) setFlightMode("AUTO")
        break
      case "mode_guided":
        if (connected) setFlightMode("GUIDED")
        break
      case "mode_rtl":
        if (connected) setFlightMode("RTL")
        break
      case "mode_land":
        if (connected) setFlightMode("LAND")
        break
      case "mode_brake":
        if (connected) setFlightMode("BRAKE")
        break
      case "mode_throw":
        if (connected) setFlightMode("THROW")
        break
      case "mode_poshold":
        if (connected) setFlightMode("POSHOLD")
        break
        
      // Gimbal control using actual MAVLink commands
      case "gimbal_point_here":
        if (connected) {
          console.log(`Pointing gimbal to: ${lat.toFixed(6)}, ${lon.toFixed(6)}`)
          // Calculate gimbal angles to point at location (simplified calculation)
          const pitch = -45 // Point down at 45 degrees
          const yaw = 0 // No yaw adjustment for now
          const roll = 0 // No roll adjustment
          controlGimbal(pitch, yaw, roll)
            .then(() => {
              console.log("Gimbal point command sent successfully")
            })
            .catch((error) => {
              console.error("Failed to control gimbal:", error)
            })
        }
        break
      case "gimbal_center":
        if (connected) {
          console.log("Centering gimbal")
          controlGimbal(0, 0, 0) // Center gimbal to neutral position
            .then(() => {
              console.log("Gimbal center command sent successfully")
            })
            .catch((error) => {
              console.error("Failed to center gimbal:", error)
            })
        }
        break
        
      // Preflight actions - using actual MAVLink commands
      case "arm_motors":
        if (connected && !telemetry?.armed) {
          console.log("Arming motors")
          setArmed(true)
            .then(() => {
              console.log("Motors armed successfully")
            })
            .catch((error) => {
              console.error("Failed to arm motors:", error)
            })
        }
        break
      case "disarm_motors":
        if (connected && telemetry?.armed) {
          console.log("Disarming motors")
          setArmed(false)
            .then(() => {
              console.log("Motors disarmed successfully")
            })
            .catch((error) => {
              console.error("Failed to disarm motors:", error)
            })
        }
        break
      case "takeoff":
        if (connected && telemetry?.armed) {
          console.log("Initiating takeoff")
          sendTakeoffCommand(10) // 10 meter takeoff altitude
            .then(() => {
              console.log("Takeoff command sent successfully")
            })
            .catch((error) => {
              console.error("Failed to send takeoff command:", error)
            })
        }
        break
      case "emergency_stop":
        if (connected) {
          console.log("EMERGENCY STOP!")
          emergencyStop()
            .then(() => {
              console.log("Emergency stop command sent")
            })
            .catch((error) => {
              console.error("Failed to send emergency stop:", error)
            })
        }
        break
        
      // Map functions
      case "zoom_to_fit":
        // Zoom to fit all waypoints
        if (waypoints.length > 0) {
          let minLat = waypoints[0].x, maxLat = waypoints[0].x
          let minLon = waypoints[0].y, maxLon = waypoints[0].y
          
          waypoints.forEach(wp => {
            minLat = Math.min(minLat, wp.x)
            maxLat = Math.max(maxLat, wp.x)
            minLon = Math.min(minLon, wp.y)
            maxLon = Math.max(maxLon, wp.y)
          })
          
          const centerLat = (minLat + maxLat) / 2
          const centerLon = (minLon + maxLon) / 2
          setMapCenter({ lat: centerLat, lon: centerLon })
          
          // Calculate appropriate zoom level
          const latDiff = maxLat - minLat
          const lonDiff = maxLon - minLon
          const maxDiff = Math.max(latDiff, lonDiff)
          let newZoom = 15
          if (maxDiff > 0.1) newZoom = 10
          else if (maxDiff > 0.01) newZoom = 13
          else if (maxDiff > 0.001) newZoom = 16
          setMapZoom(newZoom)
        }
        break
        
      case "center_home":
        if (waypoints.length > 0) {
          setMapCenter({ lat: waypoints[0].x, lon: waypoints[0].y })
          setMapZoom(16)
        }
        break
        
      case "center_uav":
        if (connected && telemetry && telemetry.position.lat !== 0) {
          setMapCenter({ lat: telemetry.position.lat, lon: telemetry.position.lon })
          setMapZoom(16)
        }
        break
        
      default:
        console.log(`Unhandled context menu action: ${action}`)
    }

    setContextMenu(null)
  }

  // Helper function to add waypoints with actual MAVLink integration
  const addWaypoint = (lat: number, lon: number, alt: number = 10, commandType: string = "WAYPOINT") => {
    // Convert command string to MAVLink command number
    const getCommandNumber = (cmd: string): number => {
      switch (cmd) {
        case "WAYPOINT": return MAV_CMD.WAYPOINT
        case "SPLINE_WAYPOINT": return MAV_CMD.SPLINE_WAYPOINT
        case "TAKEOFF": return MAV_CMD.TAKEOFF
        case "LAND": return MAV_CMD.LAND
        case "RETURN_TO_LAUNCH": return MAV_CMD.RETURN_TO_LAUNCH
        case "LOITER_UNLIM": return MAV_CMD.LOITER_UNLIM
        case "LOITER_TURNS": return MAV_CMD.LOITER_TURNS
        case "LOITER_TIME": return MAV_CMD.LOITER_TIME
        case "CONDITION_DELAY": return MAV_CMD.CONDITION_DELAY
        case "DO_JUMP": return MAV_CMD.DO_JUMP
        case "DO_SET_ROI": return MAV_CMD.DO_SET_ROI
        case "DO_MOUNT_CONTROL": return MAV_CMD.DO_MOUNT_CONTROL
        default: return MAV_CMD.WAYPOINT
      }
    }
    
    const newWaypoint: Waypoint = {
      seq: waypoints.length,
      x: lat,
      y: lon,
      z: alt,
      command: getCommandNumber(commandType),
      autocontinue: 1,
      current: 0,
      frame: MAV_FRAME.GLOBAL_RELATIVE_ALT_INT,
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0
    }
    
    console.log(`Adding ${commandType} waypoint:`, newWaypoint)
    
    // Send waypoint to drone via MAVLink (async operation handled separately)
    if (connected) {
      sendGuidedWaypoint(lat, lon, alt)
        .then(() => {
          showNotification(
            `✅ Waypoint sent to drone: ${lat.toFixed(6)}, ${lon.toFixed(6)} at ${alt}m`, 
            'success'
          )
          console.log(`Waypoint sent to drone successfully: ${lat.toFixed(6)}, ${lon.toFixed(6)} at ${alt}m`)
        })
        .catch((error) => {
          showNotification("❌ Failed to send waypoint to drone", 'error')
          console.error("Failed to send waypoint to drone:", error)
        })
    } else {
      showNotification("⚠️ Not connected - waypoint added to mission only", 'info')
      console.warn("Not connected to drone - waypoint added to mission only")
    }
    
    // Notify parent component to add to waypoints array
    onMapRightClick(lat, lon, 0, 0)
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0) {
      setIsDragging(true)
      const startX = event.clientX
      const startY = event.clientY
      const startCenter = { ...mapCenter }
      
      // Store the initial world coordinates for more accurate dragging
      const scale = Math.pow(2, mapZoom)
      const startWorldX = ((startCenter.lon + 180) / 360) * 256 * scale
      const startWorldY = ((1 - Math.asinh(Math.tan(deg2rad(startCenter.lat))) / Math.PI) / 2) * 256 * scale

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY

        // Calculate new world coordinates directly
        const newWorldX = startWorldX - deltaX
        const newWorldY = startWorldY - deltaY

        // Convert back to lat/lon with proper bounds checking
        const newLon = ((newWorldX / (256 * scale)) * 360 - 180)
        const n = Math.PI - (2 * Math.PI * newWorldY) / (256 * scale)
        const newLat = rad2deg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))

        // Clamp and wrap coordinates
        const clampedLat = Math.max(-85, Math.min(85, newLat))
        const wrappedLon = ((newLon + 540) % 360) - 180

        setMapCenter({
          lat: clampedLat,
          lon: wrappedLon,
        })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("mouseleave", handleMouseUp)
      }

      // Use passive: false to allow preventDefault
      document.addEventListener("mousemove", handleMouseMove, { passive: false })
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("mouseleave", handleMouseUp)
    }
  }

  // Update map center when following drone
  useEffect(() => {
    if (followDrone && connected && telemetry && telemetry.position.lat !== 0) {
      setMapCenter({
        lat: telemetry.position.lat,
        lon: telemetry.position.lon,
      })
    }
  }, [followDrone, telemetry?.position.lat, telemetry?.position.lon, connected])

  // Optimized rendering with immediate updates during dragging
  useEffect(() => {
    // During dragging, update immediately for smooth movement
    if (isDragging) {
      drawMap()
    } else {
      // When not dragging, use requestAnimationFrame for performance
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(drawMap)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawMap, isDragging])

  // Canvas resize handler and wheel event prevention
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const container = mapRef.current
      if (canvas && container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        drawMap()
      }
    }

    // Prevent wheel events from bubbling to parent elements with proper event capture
    const handleWheelEvent = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const delta = event.deltaY > 0 ? -1 : 1
      const newZoom = Math.max(1, Math.min(20, mapZoom + delta))

      if (newZoom !== mapZoom && canvasRef.current) {
        // Get cursor position relative to canvas
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const cursorX = event.clientX - rect.left
        const cursorY = event.clientY - rect.top

        // 1. Get geographic coordinates under cursor before zoom
        const { lat: anchorLat, lon: anchorLon } = pixelToLatLon(cursorX, cursorY)

        // 2. After zoom, recalculate pixel position for anchorLat/anchorLon at new zoom
        const scale = Math.pow(2, newZoom)
        const worldX = ((anchorLon + 180) / 360) * 256 * scale
        const worldY = ((1 - Math.asinh(Math.tan(deg2rad(anchorLat))) / Math.PI) / 2) * 256 * scale

        // 3. Adjust map center so cursor stays fixed on anchorLat/anchorLon
        const centerWorldX = worldX - (cursorX - canvas.width / 2)
        const centerWorldY = worldY - (cursorY - canvas.height / 2)
        const newCenterLon = (centerWorldX / (256 * scale)) * 360 - 180
        const n = Math.PI - (2 * Math.PI * centerWorldY) / (256 * scale)
        const newCenterLat = rad2deg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))

        setMapZoom(newZoom)
        setMapCenter({ lat: newCenterLat, lon: newCenterLon })
      }
    }

    const container = mapRef.current
    if (container) {
      // Use capture phase to intercept wheel events before they can bubble
      container.addEventListener('wheel', handleWheelEvent, { passive: false, capture: true })
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (container) {
        container.removeEventListener('wheel', handleWheelEvent, { capture: true })
      }
    }
  }, [drawMap, mapZoom])

  const handleClick = (event: React.MouseEvent) => {
    if (!isDragging) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // Check waypoint clicks
        for (const waypoint of waypoints.slice(1)) {
          const pos = latLonToPixel(waypoint.x, waypoint.y)
          const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
          if (distance <= 14) {
            onWaypointClick(waypoint)
            return
          }
        }
      }
    }
    // Close context menu on any click
    setContextMenu(null)
    onMapClick()
  }

  const renderContextMenu = () => {
    if (!contextMenu?.visible) return null

    const options = getContextMenuOptions(contextMenu.lat, contextMenu.lon)

    return (
      <div className="fixed inset-0 z-40">
        {/* Backdrop to catch clicks outside menu */}
        <div 
          className="absolute inset-0"
          onClick={() => setContextMenu(null)}
        />
        <div
          className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 py-1 min-w-48 max-w-64"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 260), // Prevent menu from going off-screen
            top: Math.min(contextMenu.y, window.innerHeight - 400),
          }}
        >
        {options.map((option, index) => {
          if (option.separator) {
            return <div key={index} className="border-t border-gray-200 dark:border-gray-600 my-1" />
          }

          const hasSubmenu = option.submenu && option.submenu.length > 0

          return (
            <div key={index} className="relative group">
              <div
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                  option.disabled
                    ? "text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50"
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-200"
                }`}
                onClick={() => !option.disabled && !hasSubmenu && handleContextMenuAction(option.action)}
                onMouseEnter={() => {
                  if (submenuTimeout) {
                    clearTimeout(submenuTimeout)
                    setSubmenuTimeout(null)
                  }
                }}
                onMouseLeave={() => {
                  if (hasSubmenu) {
                    const timeout = setTimeout(() => {
                      // This timeout allows moving to submenu
                    }, 200)
                    setSubmenuTimeout(timeout)
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span className="w-4 text-center">{option.icon}</span>}
                  <span className="flex-1">{option.label}</span>
                </div>
                {hasSubmenu && <span className="text-xs text-gray-400">▶</span>}
              </div>
              
              {/* Submenu */}
              {hasSubmenu && (
                <div className="absolute left-full top-0 ml-1 hidden group-hover:block bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-44 z-50">
                  {option.submenu!.map((subOption, subIndex) => (
                    <div
                      key={subIndex}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${
                        subOption.disabled
                          ? "text-gray-400 cursor-not-allowed"
                          : "hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-200"
                      }`}
                      onClick={() => {
                        if (!subOption.disabled) {
                          handleContextMenuAction(subOption.action)
                        }
                      }}
                    >
                      {subOption.icon && <span className="w-4 text-center">{subOption.icon}</span>}
                      <span className="flex-1">{subOption.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        
        {/* Mission Planner-style footer */}
        <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
          <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
            {contextMenu.lat.toFixed(6)}, {contextMenu.lon.toFixed(6)}
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full relative overflow-hidden select-none bg-slate-200 touch-none"
      style={{
        cursor: isDragging ? "grabbing" : "crosshair",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
        }}
        onContextMenu={handleRightClick}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCrosshairPos(null)}
      />

      {/* Map provider selector */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs rounded overflow-hidden">
        <select
          value={mapProvider}
          onChange={(e) => setMapProvider(e.target.value as MapProvider)}
          className="bg-transparent text-white px-2 py-1 outline-none"
        >
          <option value="google_satellite">Google Satellite</option>
          <option value="google_hybrid">Google Hybrid</option>
          <option value="google_terrain">Google Terrain</option>
          <option value="bing_satellite">Bing Satellite</option>
          <option value="bing_hybrid">Bing Hybrid</option>
          <option value="osm">OpenStreetMap</option>
        </select>
        <span className="px-2 py-1 border-l border-white/30">
          Zoom: {mapZoom}
          {connected && telemetry && (
            <span className="ml-2 text-green-400">• GPS: {telemetry.gps.fix_type >= 3 ? "3D_FIX" : "NO_FIX"}</span>
          )}
        </span>
      </div>

      {/* Coordinate display */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {crosshairPos
          ? (() => {
              const { lat, lon } = pixelToLatLon(crosshairPos.x, crosshairPos.y)
              return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
            })()
          : `${mapCenter.lat.toFixed(6)}, ${mapCenter.lon.toFixed(6)}`}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
        <button
          onClick={() => {
            const newZoom = Math.min(20, mapZoom + 1)
            let cursorX, cursorY
            if (crosshairPos) {
              cursorX = crosshairPos.x
              cursorY = crosshairPos.y
            } else {
              // Default to center of canvas
              const canvas = canvasRef.current
              cursorX = canvas ? canvas.width / 2 : 0
              cursorY = canvas ? canvas.height / 2 : 0
            }
            // Calculate lat/lon under cursor before zoom
            const { lat, lon } = pixelToLatLon(cursorX, cursorY)
            // Calculate new map center so cursor stays at same geo point
            const canvas = canvasRef.current
            if (canvas) {
              const scale = Math.pow(2, newZoom)
              const worldX = ((lon + 180) / 360) * 256 * scale
              const worldY = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 256 * scale
              const centerWorldX = worldX - (cursorX - canvas.width / 2)
              const centerWorldY = worldY - (cursorY - canvas.height / 2)
              const newCenterLon = (centerWorldX / (256 * scale)) * 360 - 180
              const n = Math.PI - (2 * Math.PI * centerWorldY) / (256 * scale)
              const newCenterLat = (Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))) * (180 / Math.PI)
              setMapZoom(newZoom)
              setMapCenter({ lat: newCenterLat, lon: newCenterLon })
            } else {
              setMapZoom(newZoom)
            }
          }}
          className="bg-black/70 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-black/90 transition-colors text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => {
            const newZoom = Math.max(1, mapZoom - 1)
            let cursorX, cursorY
            if (crosshairPos) {
              cursorX = crosshairPos.x
              cursorY = crosshairPos.y
            } else {
              // Default to center of canvas
              const canvas = canvasRef.current
              cursorX = canvas ? canvas.width / 2 : 0
              cursorY = canvas ? canvas.height / 2 : 0
            }
            // Calculate lat/lon under cursor before zoom
            const { lat, lon } = pixelToLatLon(cursorX, cursorY)
            // Calculate new map center so cursor stays at same geo point
            const canvas = canvasRef.current
            if (canvas) {
              const scale = Math.pow(2, newZoom)
              const worldX = ((lon + 180) / 360) * 256 * scale
              const worldY = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 256 * scale
              const centerWorldX = worldX - (cursorX - canvas.width / 2)
              const centerWorldY = worldY - (cursorY - canvas.height / 2)
              const newCenterLon = (centerWorldX / (256 * scale)) * 360 - 180
              const n = Math.PI - (2 * Math.PI * centerWorldY) / (256 * scale)
              const newCenterLat = (Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))) * (180 / Math.PI)
              setMapZoom(newZoom)
              setMapCenter({ lat: newCenterLat, lon: newCenterLon })
            } else {
              setMapZoom(newZoom)
            }
          }}
          className="bg-black/70 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-black/90 transition-colors text-lg font-bold"
        >
          −
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-16 bg-black/70 text-white text-xs px-2 py-1 rounded">
        Scale: 1:{Math.round((40075000 * Math.cos((mapCenter.lat * Math.PI) / 180)) / Math.pow(2, mapZoom + 8))}
      </div>

      {/* Center on UAV */}
      {connected && telemetry && telemetry.gps.fix_type >= 2 && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => {
              if (telemetry) {
                setMapCenter({
                  lat: telemetry.position.lat,
                  lon: telemetry.position.lon,
                })
              }
            }}
            className="bg-black/70 text-white px-3 py-2 rounded text-xs hover:bg-black/90 transition-colors"
          >
            Center on UAV
          </button>
        </div>
      )}

      {/* Context Menu */}
      {renderContextMenu()}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded">
          Loading map tiles...
        </div>
      )}

      {/* Notification System */}
      {notification?.visible && (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md text-center font-medium ${
          notification.type === 'success' 
            ? 'bg-green-600 text-white' 
            : notification.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-blue-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
