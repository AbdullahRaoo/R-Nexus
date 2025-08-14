"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Battery, Signal } from "lucide-react"
import type { TelemetryData } from "@/lib/mavlink-types"

interface MissionPlannerHUDProps {
  telemetry: TelemetryData | null
  connected: boolean
}

export function MissionPlannerHUD({ telemetry, connected }: MissionPlannerHUDProps) {
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

  const getBatteryColor = (percentage: number): string => {
    if (percentage > 50) return "bg-green-500"
    if (percentage > 20) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-4 pr-2">
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            System Status
            <Badge variant={connected ? "default" : "secondary"} className="text-xs">
              {connected ? "ONLINE" : "OFFLINE"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connected && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">No MAVLink Connection</span>
            </div>
          )}

          {connected && telemetry && (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Flight Mode</div>
                  <Badge variant="outline" className="mt-1">
                    {telemetry.mode || "UNKNOWN"}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">Armed Status</div>
                  <Badge variant={telemetry.armed ? "destructive" : "secondary"} className="mt-1">
                    {telemetry.armed ? "ARMED" : "DISARMED"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">System Load</div>
                  <div className="font-mono">{telemetry.system.load.toFixed(1)}%</div>
                  <Progress value={telemetry.system.load} className="h-1 mt-1" />
                </div>
                <div>
                  <div className="text-muted-foreground">Errors</div>
                  <div className="font-mono">{telemetry.system.errors || 0}</div>
                </div>
              </div>
            </>
          )}

          {connected && !telemetry && (
            <div className="text-center text-muted-foreground text-sm py-4">Waiting for telemetry data...</div>
          )}
        </CardContent>
      </Card>

      {/* Battery Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Battery className="h-4 w-4" />
            Battery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected && telemetry ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Charge Level</span>
                  <span className="font-mono">{telemetry.battery.percentage.toFixed(1)}%</span>
                </div>
                <Progress
                  value={telemetry.battery.percentage}
                  className="h-2"
                  style={{
                    background: `linear-gradient(to right, ${getBatteryColor(telemetry.battery.percentage)} 0%, ${getBatteryColor(telemetry.battery.percentage)} 100%)`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Voltage</div>
                  <div className="font-mono">{telemetry.battery.voltage.toFixed(2)}V</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-mono">{telemetry.battery.current.toFixed(2)}A</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Est. Flight Time: {Math.floor((telemetry.battery.percentage / 100) * 25)} min
              </div>

              {telemetry.battery.percentage < 20 && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Low Battery Warning</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">
              {connected ? "No battery data" : "Disconnected"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GPS Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Signal className="h-4 w-4" />
            GPS Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected && telemetry ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fix Type</span>
                <Badge variant="outline" className={getGpsFixColor(telemetry.gps.fix_type)}>
                  {getGpsFixText(telemetry.gps.fix_type)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Satellites</div>
                  <div className="font-mono">{telemetry.gps.satellites || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">HDOP</div>
                  <div className="font-mono">{telemetry.gps.hdop.toFixed(2)}</div>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div>Lat: {telemetry.gps.lat.toFixed(7)}°</div>
                <div>Lon: {telemetry.gps.lon.toFixed(7)}°</div>
              </div>

              {telemetry.gps.fix_type < 3 && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Poor GPS Signal</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">
              {connected ? "No GPS data" : "Disconnected"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Radio Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Radio Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected && telemetry ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">RC RSSI</div>
                  <div className="font-mono">{telemetry.rc.rssi || 0}%</div>
                  <Progress value={telemetry.rc.rssi || 0} className="h-1 mt-1" />
                </div>
                <div>
                  <div className="text-muted-foreground">Channels</div>
                  <div className="font-mono">{telemetry.rc.channels.length || 0}</div>
                </div>
              </div>

              {(telemetry.rc.rssi || 0) < 50 && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Weak RC Signal</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">
              {connected ? "No radio data" : "Disconnected"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
