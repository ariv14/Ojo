'use client'

import { motion } from 'framer-motion'
import { Gift, Share2, Info } from 'lucide-react'

export type RewardsTab = 'claim' | 'share' | 'about'

interface FloatingPillNavProps {
  activeTab: RewardsTab
  onTabChange: (tab: RewardsTab) => void
}

const tabs: { id: RewardsTab; label: string; icon: typeof Gift }[] = [
  { id: 'claim', label: 'Claim', icon: Gift },
  { id: 'share', label: 'Share', icon: Share2 },
  { id: 'about', label: 'About', icon: Info },
]

export default function FloatingPillNav({ activeTab, onTabChange }: FloatingPillNavProps) {
  return (
    <div className="sticky top-4 z-50 flex justify-center px-4 pt-4">
      <nav className="relative flex bg-white/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-white/50">
        {/* Active indicator */}
        <motion.div
          layoutId="activeTab"
          className="absolute inset-y-1.5 rounded-full bg-gradient-to-r from-[var(--oro-cyan)] to-[var(--oro-purple)]"
          style={{
            width: `calc(${100 / tabs.length}% - 4px)`,
          }}
          initial={false}
          animate={{
            x: tabs.findIndex((t) => t.id === activeTab) * (100 / tabs.length) + '%',
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        />

        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
