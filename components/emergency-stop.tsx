"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Zap } from "lucide-react"

interface EmergencyStopProps {
  connected: boolean
  onEmergencyStop: () => void
}

export function EmergencyStop({ connected, onEmergencyStop }: EmergencyStopProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleEmergencyStop = () => {
    onEmergencyStop()
    setShowConfirmDialog(false)
  }

  return (
    <>
      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!connected}
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            EMERGENCY STOP
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Immediately disarms motors and stops all flight operations
          </p>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency Stop Confirmation
            </DialogTitle>
            <DialogDescription className="text-base">
              <strong>WARNING:</strong> This will immediately disarm the motors and stop all flight operations. The UAV
              will fall from its current position.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              Only use this in genuine emergencies when the UAV poses an immediate danger. This action cannot be undone
              and may result in UAV damage.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEmergencyStop} className="bg-red-600 hover:bg-red-700">
              <Zap className="h-4 w-4 mr-2" />
              CONFIRM EMERGENCY STOP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
