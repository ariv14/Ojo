'use client'

import { Coins, ShieldCheck, Flame, Gift, Clock, Sparkles } from 'lucide-react'

export default function AboutTab() {
  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Coins className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">About OJO Rewards</h2>
        <p className="text-gray-500">
          Earn OJO tokens for being a verified human
        </p>
      </div>

      {/* What is OJO */}
      <div className="card-oro p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          What is OJO?
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          OJO is the native token of the OJO platform. As a verified human,
          you can earn OJO daily just by showing up and claiming your rewards.
          OJO can be used for premium features, tipping creators, and more.
        </p>
      </div>

      {/* How it Works */}
      <div className="card-oro p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" />
          How it Works
        </h3>
        <div className="space-y-4">
          <FeatureItem
            icon={<Clock className="w-4 h-4 text-cyan-500" />}
            title="Daily Claims"
            description="Claim once every 24 hours. Each claim earns you 1.0 OJO base reward."
          />
          <FeatureItem
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            title="Streak Bonuses"
            description="Build daily streaks for bonus OJO. Up to +1.0 extra OJO at 10+ day streaks!"
          />
          <FeatureItem
            icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
            title="Verified Only"
            description="Only Orb-verified World ID holders can claim. No bots, no fake accounts."
          />
        </div>
      </div>

      {/* Streak Breakdown */}
      <div className="card-oro-warm p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Streak Bonuses
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Day 1</span>
            <span className="font-semibold text-gray-800">1.0 + 0.1 = 1.1 OJO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Day 3</span>
            <span className="font-semibold text-gray-800">1.0 + 0.3 = 1.3 OJO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Day 7</span>
            <span className="font-semibold text-gray-800">1.0 + 0.7 = 1.7 OJO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Day 10+</span>
            <span className="font-semibold text-amber-600">1.0 + 1.0 = 2.0 OJO (max)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Miss a day? Your streak resets after 48 hours of no claims.
        </p>
      </div>

      {/* FAQ */}
      <div className="card-oro p-5">
        <h3 className="font-semibold text-gray-800 mb-4">FAQ</h3>
        <div className="space-y-4">
          <FAQItem
            question="When does my claim reset?"
            answer="24 hours after your last claim. The timer shows exactly when you can claim again."
          />
          <FAQItem
            question="What happens if I miss a day?"
            answer="Your streak will reset if you don't claim within 48 hours of your last claim."
          />
          <FAQItem
            question="What can I use OJO for?"
            answer="Currently, OJO can be used for premium content unlocks and tipping creators. More uses coming soon!"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-800 text-sm">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h4 className="font-medium text-gray-800 text-sm mb-1">{question}</h4>
      <p className="text-xs text-gray-500">{answer}</p>
    </div>
  )
}
