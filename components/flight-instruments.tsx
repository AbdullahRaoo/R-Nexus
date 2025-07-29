"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TelemetryData } from "@/lib/mavlink-types"

interface FlightInstrumentsProps {
  telemetry: TelemetryData | null
  connected: boolean
}

export function FlightInstruments({ telemetry, connected }: FlightInstrumentsProps) {
  const attitudeCanvasRef = useRef<HTMLCanvasElement>(null)
  const headingCanvasRef = useRef<HTMLCanvasElement>(null)

  // Attitude Indicator (Artificial Horizon)
  useEffect(() => {
    const canvas = attitudeCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 120
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    if (!connected || !telemetry) {
      // Draw offline indicator
      ctx.fillStyle = "#374151"
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = "#6b7280"
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = "#9ca3af"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("NO DATA", centerX, centerY)
      return
    }

    const roll = (telemetry.attitude.roll * Math.PI) / 180 || 0
    const pitch = (telemetry.attitude.pitch * Math.PI) / 180 || 0

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(-roll)

    // Sky (blue)
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

    // Ground (brown)
    ctx.fillStyle = "#8B4513"
    const groundY = pitch * (radius / (Math.PI / 4))
    ctx.fillRect(-radius, groundY, radius * 2, radius * 2)

    // Horizon line
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-radius, groundY)
    ctx.lineTo(radius, groundY)
    ctx.stroke()

    // Pitch lines
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    for (let angle = -60; angle <= 60; angle += 10) {
      if (angle === 0) continue
      const y = groundY + ((angle * Math.PI) / 180) * (radius / (Math.PI / 4))
      const lineWidth = angle % 30 === 0 ? 30 : 15
      ctx.beginPath()
      ctx.moveTo(-lineWidth, y)
      ctx.lineTo(lineWidth, y)
      ctx.stroke()

      if (angle % 30 === 0) {
        ctx.font = "10px Arial"
        ctx.textAlign = "center"
        ctx.fillStyle = "#ffffff"
        ctx.fillText(Math.abs(angle).toString(), -lineWidth - 15, y + 3)
        ctx.fillText(Math.abs(angle).toString(), lineWidth + 15, y + 3)
      }
    }

    ctx.restore()

    // Aircraft symbol (fixed)
    ctx.strokeStyle = "#ffff00"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX - 20, centerY)
    ctx.lineTo(centerX - 5, centerY)
    ctx.moveTo(centerX + 5, centerY)
    ctx.lineTo(centerX + 20, centerY)
    ctx.moveTo(centerX, centerY - 5)
    ctx.lineTo(centerX, centerY + 5)
    ctx.stroke()

    // Outer ring
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // Roll scale
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180
      const x1 = centerX + Math.cos(rad - Math.PI / 2) * (radius - 5)
      const y1 = centerY + Math.sin(rad - Math.PI / 2) * (radius - 5)
      const x2 = centerX + Math.cos(rad - Math.PI / 2) * radius
      const y2 = centerY + Math.sin(rad - Math.PI / 2) * radius

      if (angle % 30 === 0) {
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    // Roll indicator
    const rollIndicatorX = centerX + Math.cos(-roll - Math.PI / 2) * (radius + 10)
    const rollIndicatorY = centerY + Math.sin(-roll - Math.PI / 2) * (radius + 10)
    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.arc(rollIndicatorX, rollIndicatorY, 3, 0, 2 * Math.PI)
    ctx.fill()
  }, [telemetry, connected])

  // Heading Indicator (Compass)
  useEffect(() => {
    const canvas = headingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 120
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    if (!connected || !telemetry) {
      // Draw offline indicator
      ctx.fillStyle = "#374151"
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = "#6b7280"
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = "#9ca3af"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("NO DATA", centerX, centerY)
      return
    }

    const heading = (telemetry.position.heading * Math.PI) / 180 || 0

    // Background
    ctx.fillStyle = "#000000"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fill()

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(-heading)

    // Compass rose
    const directions = ["N", "E", "S", "W"]
    const directionAngles = [0, 90, 180, 270]

    ctx.strokeStyle = "#ffffff"
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"

    for (let i = 0; i < 4; i++) {
      const angle = (directionAngles[i] * Math.PI) / 180
      const x = Math.cos(angle - Math.PI / 2) * (radius - 20)
      const y = Math.sin(angle - Math.PI / 2) * (radius - 20)

      if (i === 0)
        ctx.fillStyle = "#ff0000" // North in red
      else ctx.fillStyle = "#ffffff"

      ctx.fillText(directions[i], x, y + 5)
    }

    // Degree markings
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180
      const x1 = Math.cos(rad - Math.PI / 2) * (radius - 5)
      const y1 = Math.sin(rad - Math.PI / 2) * (radius - 5)
      const x2 = Math.cos(rad - Math.PI / 2) * radius
      const y2 = Math.sin(rad - Math.PI / 2) * radius

      if (angle % 30 === 0) {
        ctx.lineWidth = 2
      } else {
        ctx.lineWidth = 1
      }

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    ctx.restore()

    // Aircraft heading pointer (fixed)
    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius + 5)
    ctx.lineTo(centerX - 5, centerY - radius + 15)
    ctx.lineTo(centerX + 5, centerY - radius + 15)
    ctx.closePath()
    ctx.fill()

    // Outer ring
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // Heading value
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`${Math.round(telemetry.position.heading || 0)}°`, centerX, centerY + 25)
  }, [telemetry, connected])

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-center">Attitude</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <canvas ref={attitudeCanvasRef} className="border rounded" />
        </CardContent>
        <div className="px-4 pb-4 text-xs text-center space-y-1">
          <div>Roll: {connected && telemetry ? `${telemetry.attitude.roll.toFixed(1)}°` : "0.0°"}</div>
          <div>Pitch: {connected && telemetry ? `${telemetry.attitude.pitch.toFixed(1)}°` : "0.0°"}</div>
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-center">Heading</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <canvas ref={headingCanvasRef} className="border rounded" />
        </CardContent>
        <div className="px-4 pb-4 text-xs text-center">
          <div>Heading: {connected && telemetry ? `${Math.round(telemetry.position.heading)}°` : "0°"}</div>
          <div>Yaw: {connected && telemetry ? `${telemetry.attitude.yaw.toFixed(1)}°` : "0.0°"}</div>
        </div>
      </Card>
    </div>
  )
}
