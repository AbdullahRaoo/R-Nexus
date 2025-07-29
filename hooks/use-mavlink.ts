"use client"

import { useState, useEffect, useRef } from "react"
import { MAVLinkConnection } from "@/lib/mavlink-connection"
import type { TelemetryData, Waypoint } from "@/lib/mavlink-types"
import { useToast } from "@/hooks/use-toast"

export function useMAVLink() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [connected, setConnected] = useState(false)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [connectionStatus, setConnectionStatus] = useState({
    port: "Unknown",
    baudRate: "57600",
    attempting: false,
  })
  const connectionRef = useRef<MAVLinkConnection | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Initialize MAVLink connection but don't auto-connect
    const connection = new MAVLinkConnection()
    connectionRef.current = connection

    // Set up event handlers
    connection.onTelemetry((data) => {
      setTelemetry(data)
    })

    connection.onConnection((isConnected, port = "Unknown", baudRate = "57600") => {
      setConnected(isConnected)
      setConnectionStatus((prev) => ({
        ...prev,
        port,
        baudRate,
        attempting: false,
      }))

      if (isConnected) {
        toast({
          title: "MAVLink Connected",
          description: `Successfully connected to UAV on ${port} @ ${baudRate} baud`,
        })
      } else {
        toast({
          title: "MAVLink Disconnected",
          description: "Lost connection to UAV telemetry",
          variant: "destructive",
        })
      }
    })

    connection.onWaypoints((wps) => {
      setWaypoints(wps)
    })

    // Cleanup on unmount
    return () => {
      connection.disconnect()
    }
  }, [toast])

  // Manual connection control
  const connect = async () => {
    if (connectionRef.current && !connected) {
      setConnectionStatus((prev) => ({ ...prev, attempting: true }))
      toast({
        title: "Connecting...",
        description: "Scanning for SiK Radio telemetry modules...",
      })
      connectionRef.current.connect()
    }
  }

  const disconnect = () => {
    if (connectionRef.current && connected) {
      connectionRef.current.disconnect()
      setConnected(false)
      setTelemetry(null)
      setWaypoints([])
      toast({
        title: "Disconnected",
        description: "MAVLink connection closed",
      })
    }
  }

  // Command functions
  const armDisarm = (arm: boolean) => {
    connectionRef.current?.armDisarm(arm)
  }

  const setMode = (mode: string) => {
    connectionRef.current?.setMode(mode)
  }

  const takeoff = (altitude: number) => {
    connectionRef.current?.takeoff(altitude)
  }

  const rtl = () => {
    connectionRef.current?.rtl()
  }

  const flyToHere = (lat: number, lon: number, alt: number) => {
    connectionRef.current?.setGuidedTarget(lat, lon, alt)
  }

  const uploadWaypoints = (wps: Waypoint[]) => {
    connectionRef.current?.uploadWaypoints(wps)
  }

  const downloadWaypoints = () => {
    connectionRef.current?.downloadWaypoints()
  }

  const clearWaypoints = () => {
    connectionRef.current?.clearWaypoints()
  }

  const addWaypoint = (waypoint: Waypoint) => {
    setWaypoints(prev => [...prev, waypoint])
  }

  const startMission = () => {
    connectionRef.current?.startMission()
  }

  const pauseMission = () => {
    connectionRef.current?.pauseMission()
  }

  const resumeMission = () => {
    connectionRef.current?.resumeMission()
  }

  return {
    telemetry,
    connected,
    waypoints,
    connectionStatus,
    connect,
    disconnect,
    commands: {
      armDisarm,
      setMode,
      takeoff,
      rtl,
      flyToHere,
      uploadWaypoints,
      downloadWaypoints,
      clearWaypoints,
      addWaypoint,
      startMission,
      pauseMission,
      resumeMission,
    },
  }
}
