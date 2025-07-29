"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Eye, Calendar, Clock, MapPin, Battery, AlertTriangle } from "lucide-react"
import { useMAVLink } from "@/hooks/use-mavlink"

interface MissionLog {
  id: string
  name: string
  date: string
  duration: string
  status: "Completed" | "Aborted" | "Incomplete"
  distance: number
  waypoints: number
  batteryUsed: number
  maxAltitude: number
  avgSpeed: number
}

export default function MissionLogs() {
  const { connected } = useMAVLink()
  const [selectedMission, setSelectedMission] = useState<MissionLog | null>(null)

  // Real mission logs would come from actual flight data
  const missionLogs: MissionLog[] = []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "Aborted":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "Incomplete":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Mission Logs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Connection Warning */}
        {!connected && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium text-yellow-700 dark:text-yellow-400">No UAV Connection</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-300">
                    Connect to UAV to access mission logs and flight history
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Missions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{missionLogs.length}</div>
              <p className="text-xs text-muted-foreground">
                {missionLogs.filter((m) => m.status === "Completed").length} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flight Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">00:00:00</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distance Covered</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.0 km</div>
              <p className="text-xs text-muted-foreground">Total distance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Battery Usage</CardTitle>
              <Battery className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Per mission</p>
            </CardContent>
          </Card>
        </div>

        {/* Mission Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mission History</CardTitle>
            <CardDescription>Complete log of all UAV missions</CardDescription>
          </CardHeader>
          <CardContent>
            {missionLogs.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <div className="text-lg font-medium text-muted-foreground mb-2">No Mission Logs Available</div>
                <div className="text-sm text-muted-foreground mb-4">
                  {connected
                    ? "No missions have been completed yet. Start your first flight to see logs here."
                    : "Connect to UAV to access mission logs and flight history."}
                </div>
                {connected && (
                  <Button asChild>
                    <a href="/flight-data">Start First Mission</a>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mission ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Battery Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missionLogs.map((mission) => (
                    <TableRow key={mission.id}>
                      <TableCell className="font-medium">{mission.id}</TableCell>
                      <TableCell>{mission.name}</TableCell>
                      <TableCell>{new Date(mission.date).toLocaleDateString()}</TableCell>
                      <TableCell>{mission.duration}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(mission.status)}>
                          {mission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{mission.distance} km</TableCell>
                      <TableCell>{mission.batteryUsed}%</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedMission(mission)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Mission Details - {mission.name}</DialogTitle>
                                <DialogDescription>Complete mission information and telemetry data</DialogDescription>
                              </DialogHeader>
                              {selectedMission && (
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Mission Info</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Mission ID:</span>
                                          <span className="font-medium">{selectedMission.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Date:</span>
                                          <span>{new Date(selectedMission.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Duration:</span>
                                          <span>{selectedMission.duration}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Status:</span>
                                          <Badge variant="outline" className={getStatusColor(selectedMission.status)}>
                                            {selectedMission.status}
                                          </Badge>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Flight Data</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Distance:</span>
                                          <span>{selectedMission.distance} km</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Waypoints:</span>
                                          <span>{selectedMission.waypoints}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Max Altitude:</span>
                                          <span>{selectedMission.maxAltitude} m</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Avg Speed:</span>
                                          <span>{selectedMission.avgSpeed} m/s</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                  <Card>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm">Telemetry Log</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <ScrollArea className="h-32">
                                        <div className="space-y-1 text-xs font-mono">
                                          <div>[{selectedMission.date} 10:15:23] Mission started</div>
                                          <div>[{selectedMission.date} 10:15:45] Takeoff completed</div>
                                          <div>[{selectedMission.date} 10:16:12] Waypoint 1 reached</div>
                                          <div>[{selectedMission.date} 10:18:34] Waypoint 2 reached</div>
                                          <div>[{selectedMission.date} 10:21:15] Battery: 85%</div>
                                          <div>[{selectedMission.date} 10:25:42] Waypoint 5 reached</div>
                                          <div>[{selectedMission.date} 10:28:19] GPS signal: 12 satellites</div>
                                          <div>
                                            [{selectedMission.date} 10:32:05] Mission{" "}
                                            {selectedMission.status.toLowerCase()}
                                          </div>
                                        </div>
                                      </ScrollArea>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}
