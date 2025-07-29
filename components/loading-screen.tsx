"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500) // 2.5 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative">
        {/* Loading Screen Container */}
        <div className="w-96 h-64 bg-white rounded-lg shadow-2xl flex items-center justify-center overflow-hidden">
          <Image
            src="/r-nexus-loading.png"
            alt="R-Nexus Loading"
            width={384}
            height={256}
            className="object-contain"
            priority
          />
        </div>

        {/* Loading Animation */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
          Initializing R-Nexus GCS...
        </div>
      </div>
    </div>
  )
}
