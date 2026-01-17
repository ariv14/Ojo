'use client'

import { useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

export default function MiniKitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    MiniKit.install(process.env.NEXT_PUBLIC_APP_ID)
  }, [])

  return <>{children}</>
}
