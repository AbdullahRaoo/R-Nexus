"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"
import { Monitor, Moon, Sun, Wifi, Map, Bell, Save } from "lucide-react"

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    uavNickname: "Quadcopter X4-Pro",
    telemetryRate: "1000",
    mapTheme: "satellite",
    enableNotifications: true,
    enableSounds: true,
    autoConnect: true,
    emergencyRTL: true,
    batteryWarning: "20",
    connectionTimeout: "30",
  })

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    })
  }

  const handleReset = () => {
    setSettings({
      uavNickname: "Quadcopter X4-Pro",
      telemetryRate: "1000",
      mapTheme: "satellite",
      enableNotifications: true,
      enableSounds: true,
      autoConnect: true,
      emergencyRTL: true,
      batteryWarning: "20",
      connectionTimeout: "30",
    })
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    })
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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-4xl">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the Ground Control Station</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <div className="flex gap-2">
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="map-theme">Map Theme</Label>
                <p className="text-sm text-muted-foreground">Select the default map display style</p>
              </div>
              <Select
                value={settings.mapTheme}
                onValueChange={(value) => setSettings({ ...settings, mapTheme: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                  <SelectItem value="street">Street</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* UAV Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              UAV Configuration
            </CardTitle>
            <CardDescription>Configure UAV connection and identification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uav-nickname">UAV Nickname</Label>
                <Input
                  id="uav-nickname"
                  value={settings.uavNickname}
                  onChange={(e) => setSettings({ ...settings, uavNickname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="connection-timeout">Connection Timeout (s)</Label>
                <Input
                  id="connection-timeout"
                  type="number"
                  value={settings.connectionTimeout}
                  onChange={(e) => setSettings({ ...settings, connectionTimeout: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-connect on startup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically connect to UAV when the application starts
                </p>
              </div>
              <Switch
                checked={settings.autoConnect}
                onCheckedChange={(checked) => setSettings({ ...settings, autoConnect: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Telemetry Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Telemetry & Data
            </CardTitle>
            <CardDescription>Configure telemetry update rates and data handling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telemetry-rate">Telemetry Update Rate (ms)</Label>
                <Select
                  value={settings.telemetryRate}
                  onValueChange={(value) => setSettings({ ...settings, telemetryRate: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500ms (High)</SelectItem>
                    <SelectItem value="1000">1000ms (Normal)</SelectItem>
                    <SelectItem value="2000">2000ms (Low)</SelectItem>
                    <SelectItem value="5000">5000ms (Very Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="battery-warning">Battery Warning Level (%)</Label>
                <Input
                  id="battery-warning"
                  type="number"
                  min="10"
                  max="50"
                  value={settings.batteryWarning}
                  onChange={(e) => setSettings({ ...settings, batteryWarning: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Alerts
            </CardTitle>
            <CardDescription>Configure system notifications and alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Show system notifications for important events</p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play audio alerts for critical events</p>
              </div>
              <Switch
                checked={settings.enableSounds}
                onCheckedChange={(checked) => setSettings({ ...settings, enableSounds: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Emergency RTL</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically trigger Return to Launch on critical battery
                </p>
              </div>
              <Switch
                checked={settings.emergencyRTL}
                onCheckedChange={(checked) => setSettings({ ...settings, emergencyRTL: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </SidebarInset>
  )
}
