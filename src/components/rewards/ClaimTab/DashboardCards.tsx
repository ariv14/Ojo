'use client'

import { TrendingUp, Award, Zap, Calendar } from 'lucide-react'

interface DashboardCardsProps {
  totalClaimed: number
  claimCount: number
  currentStreak: number
  longestStreak: number
}

export default function DashboardCards({
  totalClaimed,
  claimCount,
  currentStreak,
  longestStreak,
}: DashboardCardsProps) {
  return (
    <div className="space-y-4 w-full max-w-sm mx-auto">
      {/* Stats Card */}
      <div className="card-oro p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Your Stats
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <StatItem
            icon={<TrendingUp className="w-4 h-4 text-cyan-500" />}
            label="Total Claimed"
            value={`${totalClaimed.toFixed(2)} OJO`}
          />
          <StatItem
            icon={<Calendar className="w-4 h-4 text-purple-500" />}
            label="Days Claimed"
            value={claimCount.toString()}
          />
          <StatItem
            icon={<Zap className="w-4 h-4 text-orange-500" />}
            label="Current Streak"
            value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
          />
          <StatItem
            icon={<Award className="w-4 h-4 text-amber-500" />}
            label="Best Streak"
            value={`${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`}
          />
        </div>
      </div>

      {/* Streak Bonus Info Card */}
      <div className="card-oro-warm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Streak Bonuses</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Claim daily to build your streak! Earn up to{' '}
              <span className="font-semibold text-orange-600">+1.0 OJO</span> bonus
              per claim with a 10+ day streak.
            </p>
          </div>
        </div>
      </div>

      {/* Streak Levels */}
      <div className="card-oro p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Streak Rewards
        </h3>
        <div className="space-y-2">
          <StreakLevel days={1} bonus={0.1} current={currentStreak} />
          <StreakLevel days={3} bonus={0.3} current={currentStreak} />
          <StreakLevel days={7} bonus={0.7} current={currentStreak} />
          <StreakLevel days={10} bonus={1.0} current={currentStreak} />
        </div>
      </div>
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function StreakLevel({
  days,
  bonus,
  current,
}: {
  days: number
  bonus: number
  current: number
}) {
  const isAchieved = current >= days
  const isNext = current < days && current >= days - 3

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
        isAchieved
          ? 'bg-green-50 border border-green-200'
          : isNext
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-gray-50 border border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            isAchieved ? 'text-green-700' : isNext ? 'text-amber-700' : 'text-gray-500'
          }`}
        >
          {days} {days === 1 ? 'Day' : 'Days'}
        </span>
        {isAchieved && (
          <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
            Achieved
          </span>
        )}
      </div>
      <span
        className={`text-sm font-semibold ${
          isAchieved ? 'text-green-600' : 'text-gray-600'
        }`}
      >
        +{bonus.toFixed(1)} OJO
      </span>
    </div>
  )
}
