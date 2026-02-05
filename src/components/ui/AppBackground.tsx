'use client'

import { ReactNode } from 'react'

interface AppBackgroundProps {
  children: ReactNode
}

export default function AppBackground({ children }: AppBackgroundProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {children}
    </div>
  )
}
