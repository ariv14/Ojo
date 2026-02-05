'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, MessageCircle, User } from 'lucide-react'
import { getSession } from '@/lib/session'

interface NavItem {
  href: string
  icon: typeof Home
  label: string
  matchPath: string | ((path: string) => boolean)
}

export default function BottomNav() {
  const pathname = usePathname()
  const session = getSession()

  const profileHref = session ? `/profile/${session.nullifier_hash}` : '/profile'

  const navItems: NavItem[] = [
    { href: '/feed', icon: Home, label: 'Feed', matchPath: '/feed' },
    { href: '/discover', icon: Search, label: 'Discover', matchPath: '/discover' },
    { href: '/inbox', icon: MessageCircle, label: 'Messages', matchPath: (p) => p === '/inbox' || p.startsWith('/chat') },
    { href: profileHref, icon: User, label: 'Profile', matchPath: (p) => p.startsWith('/profile') },
  ]

  const isActive = (item: NavItem) => {
    if (typeof item.matchPath === 'function') {
      return item.matchPath(pathname)
    }
    return pathname === item.matchPath
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F] border-t border-[#2A2A3E] pb-safe">
      <div className="w-full md:max-w-2xl mx-auto">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                  active ? 'text-[#00D4FF]' : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
