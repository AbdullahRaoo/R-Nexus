"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Upload,
  Download,
  Trash2,
  Target,
  RotateCcw,
  Navigation,
  Eye,
  EyeOff,
  AlertTriangle,
  Wifi,
  WifiOff,
  Unplug,
} from "lucide-react"
import { useMAVLink } from "@/hooks/use-mavlink"
import { MapComponent } from "@/components/map-component"
import type { Waypoint } from "@/lib/mavlink-types"
import { useToast } from "@/hooks/use-toast"
import { FlightInstruments } from "@/components/flight-instruments"
import { MissionPlannerHUD } from "@/components/mission-planner-hud"
import { PreFlightChecklist } from "@/components/pre-flight-checklist"

interface ContextMenuPosition {
  x: number
  y: number
  lat: number
  lon: number
}

export default function FlightData() {
  const { telemetry, connected, waypoints, commands, connect, disconnect, connectionStatus } = useMAVLink()
  const { toast } = useToast()
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null)
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null)
  const [followDrone, setFollowDrone] = useState(true)

  const handleMapRightClick = (lat: number, lon: number, x: number, y: number) => {
    // Check if this is a waypoint deletion call (when x is -1)
    if (x === -1) {
      // This is a waypoint deletion call, y contains the waypoint seq
      const waypointToDelete = waypoints.find(wp => wp.seq === y)
      if (waypointToDelete) {
        handleDeleteWaypoint(waypointToDelete)
      }
      return
    }
    
    // Check if this is a waypoint addition call (when x and y are 0)
    if (x === 0 && y === 0) {
      // This is a waypoint addition call from the map component
      const newWaypoint: Waypoint = {
        seq: waypoints.length,
        x: lat,
        y: lon,
        z: 10, // Default altitude
        command: 16, // MAV_CMD_NAV_WAYPOINT
        autocontinue: 1,
        current: 0,
        frame: 6, // MAV_FRAME_GLOBAL_RELATIVE_ALT_INT
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0
      }
      commands.addWaypoint(newWaypoint)
      return
    }
    
    // Otherwise, show context menu
    setContextMenu({ x, y, lat, lon })
  }

  const handleMapClick = () => {
    setContextMenu(null)
  }

  const handleWaypointClick = (waypoint: Waypoint) => {
    setSelectedWaypoint(waypoint)
  }

  const handleDeleteWaypoint = (waypointToDelete: Waypoint) => {
    if (!connected) {
      toast({
        title: "Not Connected",
        description: "Please connect to MAVLink before modifying waypoints",
        variant: "destructive",
      })
      return
    }

    // Don't allow deleting home waypoint (seq 0)
    if (waypointToDelete.seq === 0) {
      toast({
        title: "Cannot Delete Home",
        description: "Home waypoint cannot be deleted",
        variant: "destructive",
      })
      return
    }

    commands.deleteWaypoint(waypointToDelete.seq)
    setSelectedWaypoint(null)
    toast({
      title: "Waypoint Deleted",
      description: `Waypoint ${waypointToDelete.seq} has been removed from mission`,
    })
  }

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return

    if (!connected) {
      toast({
        title: "Not Connected",
        description: "Please connect to MAVLink before sending commands",
        variant: "destructive",
      })
      setContextMenu(null)
      return
    }

    switch (action) {
      case "fly-here":
        commands.flyToHere(contextMenu.lat, contextMenu.lon, telemetry?.position.alt_rel || 50)
        toast({
          title: "Fly to Here",
          description: `Commanding UAV to fly to ${contextMenu.lat.toFixed(6)}, ${contextMenu.lon.toFixed(6)}`,
        })
        break
      case "loiter-here":
        commands.setMode("LOITER")
        commands.flyToHere(contextMenu.lat, contextMenu.lon, telemetry?.position.alt_rel || 50)
        toast({
          title: "Loiter Here",
          description: `UAV will loiter at ${contextMenu.lat.toFixed(6)}, ${contextMenu.lon.toFixed(6)}`,
        })
        break
      case "rtl-from-here":
        commands.rtl()
        toast({
          title: "RTL from Here",
          description: "Return to Launch initiated",
        })
        break
    }
    setContextMenu(null)
  }

  const handleConnect = () => {
    if (connected) {
      disconnect()
    } else {
      connect()
    }
  }

  const handleArmDisarm = () => {
    if (!telemetry || !connected) return
    commands.armDisarm(!telemetry.armed)
  }

  const handleModeChange = (mode: string) => {
    if (!connected) return
    commands.setMode(mode)
  }

  const handleMissionControl = (action: string) => {
    if (!connected) return

    switch (action) {
      case "start":
        commands.startMission()
        break
      case "pause":
        commands.pauseMission()
        break
      case "resume":
        commands.resumeMission()
        break
    }
  }

  const getGpsFixText = (fixType: number): string => {
    switch (fixType) {
      case 0:
        return "NO_GPS"
      case 1:
        return "NO_FIX"
      case 2:
        return "2D_FIX"
      case 3:
        return "3D_FIX"
      case 4:
        return "DGPS"
      case 5:
        return "RTK_FLOAT"
      case 6:
        return "RTK_FIXED"
      default:
        return "UNKNOWN"
    }
  }

  const getGpsFixColor = (fixType: number): string => {
    switch (fixType) {
      case 3:
      case 4:
      case 5:
      case 6:
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case 2:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-red-500/10 text-red-500 border-red-500/20"
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 flex-1">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Flight Data</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Connection Control - Top Right */}
        <div className="flex items-center gap-2 px-4">
          {connected ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 text-white">
                <Wifi className="h-3 w-3 mr-1" />
                Connected: {connectionStatus.port} @ {connectionStatus.baudRate}
              </Badge>
              <Button onClick={handleConnect} size="sm" variant="outline" className="h-8 bg-transparent">
                <Unplug className="h-3 w-3 mr-1" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
              <Button onClick={handleConnect} size="sm" className="h-8 bg-green-600 hover:bg-green-700">
                <Wifi className="h-3 w-3 mr-1" />
                Connect
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-4rem)]">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* Disconnected Status Panel */}
          {!connected && (
            <Card className="absolute top-4 left-4 z-20 w-80 bg-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-medium text-red-700 dark:text-red-400">No MAVLink Connection</div>
                    <div className="text-sm text-red-600 dark:text-red-300">
                      Waiting for SiK Radio telemetry module...
                    </div>
                    <div className="text-xs text-red-500 dark:text-red-400">
                      Check serial connection and ensure MAVLink service is running
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mission Control Panel - Only show when connected */}
          {connected && (
            <Card className="absolute top-4 left-4 z-10 w-80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Mission Control
                  <Badge variant="default" className="text-xs bg-green-600">
                    CONNECTED
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleArmDisarm}
                    variant={telemetry?.armed ? "destructive" : "default"}
                    size="sm"
                    className="text-xs"
                  >
                    {telemetry?.armed ? "DISARM" : "ARM"}
                  </Button>
                  <Button onClick={() => commands.rtl()} variant="outline" size="sm" className="text-xs">
                    RTL
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Flight Mode</Label>
                  <Select value={telemetry?.mode || "UNKNOWN"} onValueChange={handleModeChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STABILIZE">STABILIZE</SelectItem>
                      <SelectItem value="ALT_HOLD">ALT HOLD</SelectItem>
                      <SelectItem value="LOITER">LOITER</SelectItem>
                      <SelectItem value="AUTO">AUTO</SelectItem>
                      <SelectItem value="RTL">RTL</SelectItem>
                      <SelectItem value="LAND">LAND</SelectItem>
                      <SelectItem value="GUIDED">GUIDED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <Button
                    onClick={() => handleMissionControl("start")}
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    START
                  </Button>
                  <Button onClick={() => handleMissionControl("pause")} size="sm" variant="outline" className="text-xs">
                    PAUSE
                  </Button>
                  <Button
                    onClick={() => handleMissionControl("resume")}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    RESUME
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-transparent"
                    onClick={() => commands.uploadWaypoints(waypoints)}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Write WPs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-transparent"
                    onClick={() => commands.downloadWaypoints()}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Read WPs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-transparent"
                    onClick={() => commands.clearWaypoints()}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Follow Drone</Label>
                  <Button
                    onClick={() => setFollowDrone(!followDrone)}
                    size="sm"
                    variant="outline"
                    className="h-6 w-12 p-0"
                  >
                    {followDrone ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Container - Always Visible */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="w-full h-full">
                <MapComponent
                  telemetry={telemetry}
                  waypoints={waypoints}
                  onMapRightClick={handleMapRightClick}
                  onMapClick={handleMapClick}
                  onWaypointClick={handleWaypointClick}
                  followDrone={followDrone}
                  connected={connected}
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleContextMenuAction("fly-here")} disabled={!connected}>
                <Target className="h-4 w-4 mr-2" />
                Fly to Here
                {!connected && <span className="ml-auto text-xs text-muted-foreground">(Disconnected)</span>}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleContextMenuAction("loiter-here")} disabled={!connected}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Loiter Here
                {!connected && <span className="ml-auto text-xs text-muted-foreground">(Disconnected)</span>}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleContextMenuAction("rtl-from-here")} disabled={!connected}>
                <Navigation className="h-4 w-4 mr-2" />
                RTL from Here
                {!connected && <span className="ml-auto text-xs text-muted-foreground">(Disconnected)</span>}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        {/* Right Panel - Telemetry & Waypoints */}
        <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
          <div className="flex-1">
            <div className="overflow-y-auto h-[calc(100vh-4rem)] space-y-4 p-4">
              {/* Telemetry Panel */}
              <div>
                <FlightInstruments telemetry={telemetry} connected={connected} />
              </div>

              {/* Mission Planner HUD */}
              <MissionPlannerHUD telemetry={telemetry} connected={connected} />

              {/* Pre-Flight Checklist */}
              <PreFlightChecklist telemetry={telemetry} connected={connected} onArmDisarm={handleArmDisarm} />

              {/* Waypoints Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Mission Waypoints</CardTitle>
                  <CardDescription className="text-xs">
                    {connected && telemetry
                      ? `Current WP: ${telemetry.mission.current_wp} / ${waypoints.length}`
                      : "No mission data available"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {waypoints.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {connected ? "No waypoints loaded" : "Connect to view waypoints"}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-8 p-2">#</TableHead>
                          <TableHead className="p-2">Command</TableHead>
                          <TableHead className="w-16 p-2">Alt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waypoints.map((waypoint) => (
                          <TableRow
                            key={waypoint.seq}
                            className={`text-xs cursor-pointer ${
                              waypoint.seq === telemetry?.mission.current_wp ? "bg-green-500/10" : ""
                            }`}
                            onClick={() => setSelectedWaypoint(waypoint)}
                          >
                            <TableCell className="p-2 font-medium">
                              <Badge
                                variant={waypoint.seq === telemetry?.mission.current_wp ? "default" : "outline"}
                                className="text-xs"
                              >
                                {waypoint.seq}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-2">CMD_{waypoint.command}</TableCell>
                            <TableCell className="p-2">{waypoint.z.toFixed(0)}m</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Waypoint Details Dialog */}
      <Dialog open={!!selectedWaypoint} onOpenChange={() => setSelectedWaypoint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waypoint {selectedWaypoint?.seq} Details</DialogTitle>
            <DialogDescription>MAVLink waypoint information</DialogDescription>
          </DialogHeader>
          {selectedWaypoint && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Sequence:</strong> {selectedWaypoint.seq}
                </div>
                <div>
                  <strong>Command:</strong> {selectedWaypoint.command}
                </div>
                <div>
                  <strong>Frame:</strong> {selectedWaypoint.frame}
                </div>
                <div>
                  <strong>Autocontinue:</strong> {selectedWaypoint.autocontinue ? "Yes" : "No"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Latitude:</strong> {selectedWaypoint.x.toFixed(7)}
                </div>
                <div>
                  <strong>Longitude:</strong> {selectedWaypoint.y.toFixed(7)}
                </div>
                <div>
                  <strong>Altitude:</strong> {selectedWaypoint.z.toFixed(1)}m
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Param1:</strong> {selectedWaypoint.param1}
                </div>
                <div>
                  <strong>Param2:</strong> {selectedWaypoint.param2}
                </div>
                <div>
                  <strong>Param3:</strong> {selectedWaypoint.param3}
                </div>
                <div>
                  <strong>Param4:</strong> {selectedWaypoint.param4}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex justify-between w-full">
              {selectedWaypoint && selectedWaypoint.seq !== 0 && (
                <Button 
                  onClick={() => handleDeleteWaypoint(selectedWaypoint)} 
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Waypoint
                </Button>
              )}
              <Button onClick={() => setSelectedWaypoint(null)} className="ml-auto">Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  )
}
