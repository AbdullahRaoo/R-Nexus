"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import type { TelemetryData, Waypoint } from "@/lib/mavlink-types"

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
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null)
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const lastDrawTime = useRef<number>(0)

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
      // Clear canvas with a solid background to prevent white flashes
      ctx.fillStyle = "#e2e8f0" // slate-200 background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Calculate the center tile and pixel offsets for smoother movement
      const scale = Math.pow(2, mapZoom)
      const centerWorldX = ((mapCenter.lon + 180) / 360) * 256 * scale
      const centerWorldY = ((1 - Math.asinh(Math.tan(deg2rad(mapCenter.lat))) / Math.PI) / 2) * 256 * scale
      
      const centerTileX = Math.floor(centerWorldX / 256)
      const centerTileY = Math.floor(centerWorldY / 256)
      
      // Calculate pixel offsets for sub-tile positioning
      const offsetX = (centerWorldX % 256) - 128
      const offsetY = (centerWorldY % 256) - 128

      const tileSize = 256
      const tilesX = Math.ceil(canvas.width / tileSize) + 3
      const tilesY = Math.ceil(canvas.height / tileSize) + 3

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
      let pathStarted = false
      for (let i = 1; i < waypoints.length; i++) {
        const pos = latLonToPixel(waypoints[i].x, waypoints[i].y)
        if (!pathStarted) {
          ctx.moveTo(pos.x, pos.y)
          pathStarted = true
        } else {
          ctx.lineTo(pos.x, pos.y)
        }
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

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        lat,
        lon,
        visible: true,
      })
    }
  }

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return

    console.log(`Context menu action: ${action} at ${contextMenu.lat.toFixed(6)}, ${contextMenu.lon.toFixed(6)}`)

    // Handle actions based on Mission Planner functionality
    switch (action) {
      case "fly_to_here":
        // Send guided mode command
        break
      case "loiter_here":
        // Send loiter command
        break
      case "set_home_here":
        // Set new home position
        break
      // Add more action handlers...
    }

    setContextMenu(null)
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
        
        // Calculate cursor lat/lon at current zoom using current state
        const currentScale = Math.pow(2, mapZoom)
        const centerWorldX = ((mapCenter.lon + 180) / 360) * 256 * currentScale
        const centerWorldY = ((1 - Math.asinh(Math.tan(deg2rad(mapCenter.lat))) / Math.PI) / 2) * 256 * currentScale
        
        const cursorWorldX = centerWorldX + (cursorX - canvas.width / 2)
        const cursorWorldY = centerWorldY + (cursorY - canvas.height / 2)
        
        const cursorLon = (cursorWorldX / (256 * currentScale)) * 360 - 180
        const n = Math.PI - (2 * Math.PI * cursorWorldY) / (256 * currentScale)
        const cursorLat = rad2deg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
        
        // Calculate where this cursor point should be at the new zoom level
        const newScale = Math.pow(2, newZoom)
        const newCenterWorldX = ((mapCenter.lon + 180) / 360) * 256 * newScale
        const newCenterWorldY = ((1 - Math.asinh(Math.tan(deg2rad(mapCenter.lat))) / Math.PI) / 2) * 256 * newScale
        
        const newCursorWorldX = ((cursorLon + 180) / 360) * 256 * newScale
        const newCursorWorldY = ((1 - Math.asinh(Math.tan(deg2rad(cursorLat))) / Math.PI) / 2) * 256 * newScale
        
        // Calculate adjustment needed to keep cursor at same screen position
        const requiredCenterWorldX = newCursorWorldX - (cursorX - canvas.width / 2)
        const requiredCenterWorldY = newCursorWorldY - (cursorY - canvas.height / 2)
        
        // Convert back to lat/lon
        const newCenterLon = (requiredCenterWorldX / (256 * newScale)) * 360 - 180
        const newCenterN = Math.PI - (2 * Math.PI * requiredCenterWorldY) / (256 * newScale)
        const newCenterLat = rad2deg(Math.atan(0.5 * (Math.exp(newCenterN) - Math.exp(-newCenterN))))
        
        // Apply both changes
        setMapZoom(newZoom)
        setMapCenter({
          lat: newCenterLat,
          lon: newCenterLon
        })
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
    setContextMenu(null)
    onMapClick()
  }

  const renderContextMenu = () => {
    if (!contextMenu?.visible) return null

    const options = getContextMenuOptions(contextMenu.lat, contextMenu.lon)

    return (
      <div
        className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 py-1 min-w-48"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
        }}
        onMouseLeave={() => setContextMenu(null)}
      >
        {options.map((option, index) => {
          if (option.separator) {
            return <div key={index} className="border-t border-gray-200 dark:border-gray-600 my-1" />
          }

          return (
            <div
              key={index}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${
                option.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
              onClick={() => !option.disabled && handleContextMenuAction(option.action)}
            >
              {option.icon && <span className="w-4">{option.icon}</span>}
              <span className="flex-1">{option.label}</span>
              {option.submenu && <span className="text-xs">▶</span>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full relative overflow-hidden select-none bg-slate-200 touch-none"
      style={{ cursor: isDragging ? "grabbing" : "crosshair" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
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
          onClick={() => setMapZoom((prev) => Math.min(20, prev + 1))}
          className="bg-black/70 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-black/90 transition-colors text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => setMapZoom((prev) => Math.max(1, prev - 1))}
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
    </div>
  )
}
