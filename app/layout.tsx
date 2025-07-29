import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoadingScreen } from "@/components/loading-screen"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "R-Nexus Ground Control Station",
  description: "Professional UAV Ground Control Station for multicopter operations",
  icons: {
    icon: "/r-nexus-favicon.png",
    shortcut: "/r-nexus-favicon.png",
    apple: "/r-nexus-favicon.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LoadingScreen />
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-hidden h-full">{children}</main>
            </div>
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
