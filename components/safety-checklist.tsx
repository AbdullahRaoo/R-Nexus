"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react"
import type { TelemetryData } from "@/lib/mavlink-types"

interface SafetyChecklistProps {
  telemetry: TelemetryData | null
  connected: boolean
}

interface SafetyCheck {
  id: string
  label: string
  status: "safe" | "warning" | "danger" | "unknown"
  description: string
  critical: boolean
}

export function SafetyChecklist({ telemetry, connected }: SafetyChecklistProps) {
  const getSafetyChecks = (): SafetyCheck[] => {
    if (!connected || !telemetry) {
      return [
        {
          id: "connection",
          label: "MAVLink Connection",
          status: "danger",
          description: "No telemetry connection",
          critical: true,
        },
        {
          id: "gps",
          label: "GPS Status",
          status: "unknown",
          description: "Unknown GPS status",
          critical: true,
        },
        {
          id: "battery",
          label: "Battery Level",
          status: "unknown",
          description: "Unknown battery status",
          critical: true,
        },
        {
          id: "geofence",
          label: "Geofence Status",
          status: "unknown",
          description: "Geofence status unknown",
          critical: false,
        },
      ]
    }

    return [
      {
        id: "connection",
        label: "MAVLink Connection",
        status: "safe",
        description: "Telemetry link active",
        critical: true,
      },
      {
        id: "gps",
        label: "GPS Status",
        status: telemetry.gps.fix_type >= 3 ? "safe" : telemetry.gps.fix_type >= 2 ? "warning" : "danger",
        description: `${telemetry.gps.satellites} satellites, ${telemetry.gps.fix_type >= 3 ? "3D Fix" : "Poor Fix"}`,
        critical: true,
      },
      {
        id: "battery",
        label: "Battery Level",
        status: telemetry.battery.percentage > 30 ? "safe" : telemetry.battery.percentage > 15 ? "warning" : "danger",
        description: `${telemetry.battery.percentage.toFixed(1)}% remaining`,
        critical: true,
      },
      {
        id: "altitude",
        label: "Altitude Safety",
        status: telemetry.position.alt_rel < 120 ? "safe" : "warning",
        description: `${telemetry.position.alt_rel.toFixed(1)}m AGL`,
        critical: false,
      },
      {
        id: "speed",
        label: "Speed Safety",
        status: telemetry.velocity.ground_speed < 15 ? "safe" : "warning",
        description: `${telemetry.velocity.ground_speed.toFixed(1)} m/s ground speed`,
        critical: false,
      },
      {
        id: "rc_link",
        label: "RC Link",
        status: telemetry.rc.rssi > 50 ? "safe" : telemetry.rc.rssi > 20 ? "warning" : "danger",
        description: `RSSI: ${telemetry.rc.rssi}%`,
        critical: true,
      },
    ]
  }

  const safetyChecks = getSafetyChecks()
  const criticalIssues = safetyChecks.filter((check) => check.critical && check.status === "danger").length
  const warnings = safetyChecks.filter((check) => check.status === "warning").length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "danger":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "danger":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getOverallStatus = () => {
    if (criticalIssues > 0) return "danger"
    if (warnings > 0) return "warning"
    return "safe"
  }

  return (
    <Card className={`${criticalIssues > 0 ? "border-red-500/20 bg-red-500/5" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Safety Monitor
          </div>
          <Badge variant="outline" className={getStatusColor(getOverallStatus())}>
            {criticalIssues > 0 ? "CRITICAL" : warnings > 0 ? "CAUTION" : "SAFE"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalIssues > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              {criticalIssues} Critical Safety Issue{criticalIssues > 1 ? "s" : ""} Detected
            </div>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Do not arm or fly until all critical issues are resolved
            </p>
          </div>
        )}

        <div className="space-y-2">
          {safetyChecks.map((check) => (
            <div key={check.id} className="flex items-center gap-3 p-2 rounded border">
              {getStatusIcon(check.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{check.label}</span>
                  {check.critical && (
                    <Badge variant="outline" className="text-xs">
                      Critical
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{check.description}</div>
              </div>
              <Badge variant="outline" className={getStatusColor(check.status)}>
                {check.status.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>

        {connected && criticalIssues === 0 && warnings === 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-medium text-sm">
              <CheckCircle className="h-4 w-4" />
              All Safety Checks Passed
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">UAV is ready for safe flight operations</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
