'use client'

import { useRef, useState } from 'react'
import { MessageCircle, Trophy, Users, BarChart3, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard } from './GlassCard'

const FEATURES = [
  { icon: MessageCircle, titleKey: 'features.forum.title', descKey: 'features.forum.desc', color: '#a855f7' },
  { icon: Trophy, titleKey: 'features.leaderboards.title', descKey: 'features.leaderboards.desc', color: '#f59e0b' },
  { icon: Users, titleKey: 'features.profiles.title', descKey: 'features.profiles.desc', color: '#3b82f6' },
  { icon: BarChart3, titleKey: 'features.stats.title', descKey: 'features.stats.desc', color: '#10b981' },
  { icon: UserPlus, titleKey: 'features.friends.title', descKey: 'features.friends.desc', color: '#ec4899' },
]

export function MobileFeatures() {
  const t = useTranslations('home')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / (el.scrollWidth / FEATURES.length))
    setActiveIndex(Math.min(idx, FEATURES.length - 1))
  }

  return (
    <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/5 p-5">
      <h2 className="text-2xl font-bold text-white mb-4">{t('features.title')}</h2>

      {/* Horizontal snap carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {FEATURES.map((f) => (
          <div
            key={t(f.titleKey)}
            className="snap-center shrink-0"
            style={{ width: 'calc(100% - 24px)' }}
          >
            <GlassCard accent={f.color}>
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div
                  className="size-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${f.color}20` }}
                >
                  <f.icon className="size-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-white font-semibold">{t(f.titleKey)}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{t(f.descKey)}</p>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>

      {/* Carousel dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 16 : 6,
              backgroundColor: i === activeIndex ? f.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
