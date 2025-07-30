"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import {
  Battery,
  Clock,
  MapPin,
  Navigation,
  Plane,
  Signal,
  Thermometer,
  Wind,
  Activity,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { useMAVLink } from "@/hooks/use-mavlink"

export default function Dashboard() {
  const { telemetry, connected } = useMAVLink()

  // Calculate flight time from telemetry if available
  const getFlightTime = () => {
    if (!connected || !telemetry) return "00:00:00"
    // This would be calculated from actual flight start time
    return "00:00:00"
  }

  // Get last mission from real data
  const getLastMission = () => {
    if (!connected || !telemetry) {
      return {
        name: "No Mission Data",
        duration: "00:00",
        distance: "0.00",
        waypoints: 0,
        status: "No Data",
        batteryUsed: 0,
      }
    }

    // This would come from actual mission log data
    return {
      name: "No Recent Mission",
      duration: "00:00",
      distance: "0.00",
      waypoints: 0,
      status: "No Data",
      batteryUsed: 0,
    }
  }

  const lastMission = getLastMission()

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
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
                    Connect to view Real-Time Telemetry data
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">UAV Status</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={connected ? "status-connected" : "status-disconnected"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    telemetry?.armed
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                  }
                >
                  {telemetry?.armed ? "Armed" : "Disarmed"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {connected ? "R-Nexus UAV System" : "No UAV Connected"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Battery Level</CardTitle>
              <Battery className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connected && telemetry ? `${telemetry.battery.percentage.toFixed(1)}%` : "0.00%"}
              </div>
              <Progress value={connected && telemetry ? telemetry.battery.percentage : 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {connected && telemetry
                  ? `~${Math.floor((telemetry.battery.percentage / 100) * 25)} min remaining`
                  : "No battery data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flight Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getFlightTime()}</div>
              <p className="text-xs text-muted-foreground">Current session</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Altitude</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connected && telemetry ? `${telemetry.position.alt_rel.toFixed(1)}m` : "0.00m"}
              </div>
              <p className="text-xs text-muted-foreground">
                AGL: {connected && telemetry ? `${(telemetry.position.alt_rel - 0).toFixed(1)}m` : "0.00m"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ground Speed</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connected && telemetry ? `${telemetry.velocity.ground_speed.toFixed(1)} m/s` : "0.00 m/s"}
              </div>
              <p className="text-xs text-muted-foreground">
                {connected && telemetry ? `${(telemetry.velocity.ground_speed * 3.6).toFixed(1)} km/h` : "0.00 km/h"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GPS Signal</CardTitle>
              <Signal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connected && telemetry ? telemetry.gps.satellites : 0}</div>
              <p className="text-xs text-muted-foreground">Satellites locked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connected && telemetry ? `${(25.0).toFixed(1)}°C` : "0.00°C"}</div>
              <p className="text-xs text-muted-foreground">System temp</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Last Mission Summary</CardTitle>
            <CardDescription>{connected ? "Most recent flight mission" : "No mission data available"}</CardDescription>
          </CardHeader>
          <CardContent>
            {!connected ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div>No mission data available</div>
                <div className="text-xs mt-1">Connect to UAV to view mission history</div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium">Mission: {lastMission.name}</p>
                  <p className="text-xs text-muted-foreground">Duration: {lastMission.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Distance: {lastMission.distance} km</p>
                  <p className="text-xs text-muted-foreground">{lastMission.waypoints} waypoints</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status: {lastMission.status}</p>
                  <p className="text-xs text-muted-foreground">Battery used: {lastMission.batteryUsed}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700">
            <Link href="/flight-data">
              <Navigation className="mr-2 h-4 w-4" />
              Flight Data
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/mission-logs">
              <Activity className="mr-2 h-4 w-4" />
              Mission Logs
            </Link>
          </Button>
        </div>
      </div>
    </SidebarInset>
  )
}
