"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"
import type { TelemetryData } from "@/lib/mavlink-types"

interface PreFlightChecklistProps {
  telemetry: TelemetryData | null
  connected: boolean
  onArmDisarm: (arm: boolean) => void
}

interface ChecklistItem {
  id: string
  label: string
  status: "pass" | "fail" | "warning" | "pending"
  required: boolean
  description: string
}

export function PreFlightChecklist({ telemetry, connected, onArmDisarm }: PreFlightChecklistProps) {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({
    propellers: false,
    battery_secure: false,
    payload: false,
    weather: false,
    airspace: false,
  })

  const getAutomaticChecks = (): ChecklistItem[] => {
    if (!connected || !telemetry) {
      return [
        {
          id: "connection",
          label: "MAVLink Connection",
          status: "fail",
          required: true,
          description: "No telemetry connection",
        },
        { id: "gps", label: "GPS Fix", status: "pending", required: true, description: "Waiting for connection" },
        {
          id: "battery",
          label: "Battery Level",
          status: "pending",
          required: true,
          description: "Waiting for connection",
        },
        {
          id: "sensors",
          label: "Sensor Health",
          status: "pending",
          required: true,
          description: "Waiting for connection",
        },
        {
          id: "calibration",
          label: "Calibration",
          status: "pending",
          required: true,
          description: "Waiting for connection",
        },
      ]
    }

    return [
      {
        id: "connection",
        label: "MAVLink Connection",
        status: "pass",
        required: true,
        description: "Telemetry link active",
      },
      {
        id: "gps",
        label: "GPS Fix",
        status: telemetry.gps.fix_type >= 3 ? "pass" : telemetry.gps.fix_type >= 2 ? "warning" : "fail",
        required: true,
        description: `${telemetry.gps.satellites} satellites, ${telemetry.gps.fix_type >= 3 ? "3D Fix" : "Poor Fix"}`,
      },
      {
        id: "battery",
        label: "Battery Level",
        status: telemetry.battery.percentage > 50 ? "pass" : telemetry.battery.percentage > 20 ? "warning" : "fail",
        required: true,
        description: `${telemetry.battery.percentage.toFixed(1)}% (${telemetry.battery.voltage.toFixed(1)}V)`,
      },
      {
        id: "sensors",
        label: "Sensor Health",
        status: telemetry.system.errors === 0 ? "pass" : "warning",
        required: true,
        description: `${telemetry.system.errors} errors detected`,
      },
      {
        id: "rc_link",
        label: "RC Link",
        status: telemetry.rc.rssi > 50 ? "pass" : telemetry.rc.rssi > 20 ? "warning" : "fail",
        required: true,
        description: `RSSI: ${telemetry.rc.rssi}%`,
      },
      {
        id: "mode",
        label: "Flight Mode",
        status: ["STABILIZE", "ALT_HOLD", "LOITER"].includes(telemetry.mode) ? "pass" : "warning",
        required: false,
        description: `Current: ${telemetry.mode}`,
      },
    ]
  }

  const getManualChecks = (): ChecklistItem[] => [
    {
      id: "propellers",
      label: "Propellers Secure",
      status: manualChecks.propellers ? "pass" : "pending",
      required: true,
      description: "Check propeller tightness and condition",
    },
    {
      id: "battery_secure",
      label: "Battery Secured",
      status: manualChecks.battery_secure ? "pass" : "pending",
      required: true,
      description: "Battery properly mounted and connected",
    },
    {
      id: "payload",
      label: "Payload Check",
      status: manualChecks.payload ? "pass" : "pending",
      required: false,
      description: "Camera/gimbal/sensors operational",
    },
    {
      id: "weather",
      label: "Weather Conditions",
      status: manualChecks.weather ? "pass" : "pending",
      required: true,
      description: "Wind, visibility, precipitation acceptable",
    },
    {
      id: "airspace",
      label: "Airspace Clear",
      status: manualChecks.airspace ? "pass" : "pending",
      required: true,
      description: "No aircraft, obstacles, or restrictions",
    },
  ]

  const automaticChecks = getAutomaticChecks()
  const manualChecks_items = getManualChecks()
  const allChecks = [...automaticChecks, ...manualChecks_items]

  const requiredPassed = allChecks.filter((c) => c.required && c.status === "pass").length
  const requiredTotal = allChecks.filter((c) => c.required).length
  const canArm = requiredPassed === requiredTotal

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "fail":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Pre-Flight Checklist
          <Badge variant="outline" className={canArm ? "status-connected" : "status-disconnected"}>
            {requiredPassed}/{requiredTotal} Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto py-4">
          <div className="flex flex-row gap-6">
            {/* Automatic Checks */}
            <div className="min-w-[320px] max-w-[340px] flex-shrink-0 bg-background rounded-lg shadow p-4 flex flex-col gap-2">
              <h4 className="text-sm font-medium mb-2">Automatic Checks</h4>
              {automaticChecks.map((check) => (
                <div key={check.id} className="flex items-center gap-3 p-2 rounded border">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{check.label}</span>
                      {check.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
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

            {/* Manual Checks */}
            <div className="min-w-[320px] max-w-[340px] flex-shrink-0 bg-background rounded-lg shadow p-4 flex flex-col gap-2">
              <h4 className="text-sm font-medium mb-2">Manual Checks</h4>
              {manualChecks_items.map((check) => (
                <div key={check.id} className="flex items-center gap-3 p-2 rounded border">
                  <Checkbox
                    checked={manualChecks[check.id] || false}
                    onCheckedChange={(checked) => setManualChecks((prev) => ({ ...prev, [check.id]: !!checked }))}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{check.label}</span>
                      {check.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
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

            {/* Arm/Disarm Controls */}
            <div className="min-w-[320px] max-w-[340px] flex-shrink-0 bg-background rounded-lg shadow p-4 flex flex-col gap-2">
              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    onClick={() => onArmDisarm(!telemetry?.armed)}
                    disabled={!connected || (!canArm && !telemetry?.armed)}
                    variant={telemetry?.armed ? "destructive" : "default"}
                    className="flex-1"
                  >
                    {telemetry?.armed ? "DISARM" : "ARM"} MOTORS
                  </Button>
                </div>

                {!canArm && !telemetry?.armed && (
                  <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Complete all required checks before arming
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
