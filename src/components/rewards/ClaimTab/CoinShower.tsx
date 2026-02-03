'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Coin {
  id: number
  x: number
  delay: number
  size: number
  rotation: number
  drift: number
}

interface CoinShowerProps {
  show: boolean
  onComplete?: () => void
}

export default function CoinShower({ show, onComplete }: CoinShowerProps) {
  const [coins, setCoins] = useState<Coin[]>([])

  useEffect(() => {
    if (show) {
      // Generate 40 coins with random properties
      const newCoins: Coin[] = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage across screen
        delay: Math.random() * 0.5, // stagger the start
        size: 16 + Math.random() * 24, // 16-40px
        rotation: Math.random() * 720 - 360, // random rotation
        drift: (Math.random() - 0.5) * 100, // horizontal drift
      }))
      setCoins(newCoins)

      // Clear after animation
      const timeout = setTimeout(() => {
        setCoins([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timeout)
    } else {
      setCoins([])
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {coins.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{
                y: -100,
                x: `${coin.x}vw`,
                rotate: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                y: '110vh',
                x: `calc(${coin.x}vw + ${coin.drift}px)`,
                rotate: coin.rotation,
                opacity: [1, 1, 0],
                scale: [1, 1, 0.5],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.5,
                delay: coin.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute"
              style={{
                width: coin.size,
                height: coin.size,
              }}
            >
              {/* Coin SVG */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-full h-full drop-shadow-lg"
              >
                {/* Coin body */}
                <circle
                  cx="12"
                  cy="12"
                  r="11"
                  fill="url(#coinGradient)"
                  stroke="url(#coinStroke)"
                  strokeWidth="1"
                />
                {/* Inner circle */}
                <circle cx="12" cy="12" r="8" fill="url(#coinInner)" />
                {/* OJO text or symbol */}
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fill="#b45309"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  O
                </text>
                {/* Highlight */}
                <ellipse
                  cx="8"
                  cy="7"
                  rx="3"
                  ry="2"
                  fill="rgba(255,255,255,0.4)"
                />
                {/* Gradients */}
                <defs>
                  <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="coinStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                  <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
