'use client'

import { type ReactNode, type Ref, useState, useEffect, useRef, useCallback, forwardRef } from 'react'
import {
  Grid3x3,
  Users,
  ChevronDown,
  ChevronRight,
  Monitor,
  Apple,
  Terminal,
  MessageCircle,
  Github,
  Heart,
  ExternalLink,
  Trophy,
  BarChart3,
  UserPlus,
} from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/ui/animations'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { Badge } from '@/components/ui/badge'

// ─── Skins ──────────────────────────────────────────────────────────────────

const MASCOT_SKIN = 'ahl_chinesetwinbop'

const RANDOM_SKINS = [
  'bluekitty', 'brownbear', 'cammo', 'cammostripes', 'coala',
  'default', 'limekitty', 'pinky', 'redbopp', 'redstripe',
  'saddo', 'toptri', 'twinbop', 'twintri', 'warpaint',
]

function pickRandomSkins(count: number, seed: number): string[] {
  // Deterministic pseudo-random based on seed so SSR matches client
  const picked: string[] = []
  const pool = [...RANDOM_SKINS]
  let s = seed
  for (let i = 0; i < count && pool.length > 0; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const idx = s % pool.length
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

// ─── Shared animation variants ──────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
}

const fadePill = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease } },
}

// ─── Transparent container for entire section ───────────────────────────────

const SectionShell = forwardRef(function SectionShell(
  { children, className }: { children: ReactNode; className?: string },
  ref: Ref<HTMLDivElement>,
) {
  return (
    <div ref={ref} className={`rounded-2xl p-5 landing-shell ${className ?? ''}`}>
      {children}
    </div>
  )
})

// ─── Hero ────────────────────────────────────────────────────────────────────

export function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations('home')
  return (
    <SectionShell className="text-center max-w-[500px] mx-auto">
      {/* Mascot tee with floating particles */}
      <div className="mb-4 flex justify-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[#10b981]/15 blur-2xl" />
          {/* Particles */}
          {[
            { x: -40, y: -20, size: 4, dur: 3, del: 0 },
            { x: 50, y: -30, size: 3, dur: 3.5, del: 0.5 },
            { x: -55, y: 20, size: 5, dur: 4, del: 1 },
            { x: 45, y: 35, size: 3, dur: 2.8, del: 0.3 },
            { x: -20, y: -45, size: 4, dur: 3.2, del: 0.8 },
            { x: 60, y: 5, size: 3, dur: 3.8, del: 1.2 },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-[#10b981]/40"
              style={{ width: p.size, height: p.size, left: '50%', top: '50%', marginLeft: p.x, marginTop: p.y }}
              animate={{ y: [0, -12, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          <TeeAvatarWithFallback
            skinUrl={getDDNetSkinUrl(MASCOT_SKIN)}
            lookAtCursor
            size="2xl"
          />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/30 text-foreground text-sm font-medium mb-5">
        <Grid3x3 className="size-4" />
        {t('hero.badge')}
      </div>

      <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-foreground leading-tight">
        <span className="bg-size-[200%_200%] bg-linear-to-r from-[#10b981] via-emerald-400 to-sky-400 bg-clip-text text-transparent animate-[gradient-shift_4s_ease_infinite]">
          {t('hero.title')}
        </span>
      </h1>

      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        {t('hero.description')}
      </p>

      <div className="flex gap-3 justify-center">
        <Button size="lg" asChild className="group">
          <Link href="/register">
            {t('hero.getStarted')}
            <ChevronRight className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">{t('hero.login')}</Link>
        </Button>
      </div>

      <motion.div
        className="mt-4 text-muted-foreground"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="size-5 mx-auto" />
      </motion.div>
    </SectionShell>
  )
}

// ─── Features (Radial "Sun" Layout) ─────────────────────────────────────────

const FEATURES = [
  { icon: MessageCircle, titleKey: 'features.forum.title', descKey: 'features.forum.desc', color: '#a855f7' },
  { icon: Trophy, titleKey: 'features.leaderboards.title', descKey: 'features.leaderboards.desc', color: '#f59e0b' },
  { icon: Users, titleKey: 'features.profiles.title', descKey: 'features.profiles.desc', color: '#3b82f6' },
  { icon: BarChart3, titleKey: 'features.stats.title', descKey: 'features.stats.desc', color: '#10b981' },
  { icon: UserPlus, titleKey: 'features.friends.title', descKey: 'features.friends.desc', color: '#ec4899' },
]

const SUN_RADIUS = 280
const SUN_CENTER = 380 // half of container ~760
const SUN_CENTER_Y = 330

function getSunPosition(index: number, total: number) {
  // Start from top (-90deg), go clockwise
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180)
  return {
    x: SUN_CENTER + Math.cos(angle) * SUN_RADIUS,
    y: SUN_CENTER_Y + Math.sin(angle) * SUN_RADIUS,
  }
}

export function FeaturesSection() {
  const t = useTranslations('home')
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, amount: 0.3 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Mobile: vertical list
  if (isMobile) {
    return (
      <SectionShell className="max-w-[500px]">
        <h2 className="text-3xl font-bold text-foreground mb-5">{t('features.title')}</h2>
        <motion.div className="space-y-3" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          {FEATURES.map((f) => (
            <motion.div key={t(f.titleKey)} variants={fadeUp}>
              <GlassCard accent={f.color} hover>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${f.color}20` }}>
                    <f.icon className="size-4" style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-sm">{t(f.titleKey)}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </SectionShell>
    )
  }

  // Desktop: radial sun
  return (
    <div ref={containerRef} className="relative" style={{ width: SUN_CENTER * 2, height: SUN_CENTER_Y * 2 + 40 }}>
      {/* SVG rays from center to each feature */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
        {FEATURES.map((f, i) => {
          const pos = getSunPosition(i, FEATURES.length)
          return (
            <motion.line
              key={i}
              x1={SUN_CENTER}
              y1={SUN_CENTER_Y}
              x2={pos.x}
              y2={pos.y}
              stroke={f.color}
              strokeWidth={1}
              strokeOpacity={0.3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
            />
          )
        })}
      </svg>

      {/* Center hub */}
      <motion.div
        className="absolute flex flex-col items-center justify-center text-center rounded-2xl landing-shell"
        style={{ left: SUN_CENTER - 90, top: SUN_CENTER_Y - 70, width: 180, height: 140 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute -inset-8 rounded-full bg-[#10b981]/10 blur-2xl pointer-events-none" />
        <Grid3x3 className="size-10 text-accent mb-2 relative" />
        <h2 className="text-2xl font-bold text-foreground relative leading-tight">What&apos;s<br />Inside</h2>
      </motion.div>

      {/* Feature cards around the circle */}
      {FEATURES.map((f, i) => {
        const pos = getSunPosition(i, FEATURES.length)
        const cardW = 190
        return (
          <motion.div
            key={t(f.titleKey)}
            className="absolute"
            style={{ left: pos.x - cardW / 2, top: pos.y - 50, width: cardW }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="rounded-xl landing-shell p-4 text-center cursor-default"
              style={{ boxShadow: `0 0 20px ${f.color}15` }}
              whileHover={{ scale: 1.08, boxShadow: `0 0 30px ${f.color}30` }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div
                className="size-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: `${f.color}20` }}
              >
                <f.icon className="size-5" style={{ color: f.color }} />
              </div>
              <h3 className="text-foreground font-semibold text-sm mb-1">{t(f.titleKey)}</h3>
              <p className="text-muted-foreground text-xs leading-snug">{t(f.descKey)}</p>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── DDNet Modes ─────────────────────────────────────────────────────────────

export function DDNetModesSection() {
  const t = useTranslations('home')
  return (
    <SectionShell className="max-w-[500px]">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-foreground text-xs font-medium mb-3">
        {t('ddnet.badge')}
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-2">{t('ddnet.title')}</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {t('ddnet.description')}
      </p>
      <GlassCard accent="#3b82f6">
        <motion.div
          className="grid grid-cols-2 gap-4 text-center"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          {[
            { value: 13, label: t('ddnet.categories') },
            { value: 2, label: t('ddnet.gameModes') },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp}>
              <div className="text-3xl font-bold text-blue-400">
                <AnimatedCounter value={s.value} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
          <motion.div variants={fadeUp}>
            <div className="text-2xl font-bold text-foreground">3×3 – 7×7</div>
            <div className="text-xs text-muted-foreground mt-1">{t('ddnet.gridSizes')}</div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <div className="text-2xl font-bold text-foreground">3 – 20</div>
            <div className="text-xs text-muted-foreground mt-1">{t('ddnet.raceSteps')}</div>
          </motion.div>
        </motion.div>
      </GlassCard>
    </SectionShell>
  )
}

// ─── KoG Modes ───────────────────────────────────────────────────────────────

const KOG_CATEGORIES = [
  { name: 'Easy', color: '#10b981' },
  { name: 'Main', color: '#14b8a6' },
  { name: 'Hard', color: '#eab308' },
  { name: 'Insane', color: '#f97316' },
  { name: 'Extreme', color: '#ef4444' },
  { name: 'Solo', color: '#3b82f6' },
  { name: 'Mod', color: '#a855f7' },
]

export function KoGModesSection() {
  const t = useTranslations('home')
  return (
    <SectionShell className="max-w-[520px]">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-foreground text-xs font-medium mb-3">
        {t('kog.badge')}
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-2">{t('kog.title')}</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {t('kog.description')}
      </p>
      <GlassCard accent="#10b981">
        {/* Difficulty gradient line */}
        <div className="h-1 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 mb-4 opacity-40" />
        <motion.div
          className="flex flex-wrap gap-2 justify-center"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          {KOG_CATEGORIES.map((cat, i) => (
            <motion.span
              key={cat.name}
              variants={fadePill}
              className="px-3 py-1.5 rounded-full text-xs font-medium border cursor-default"
              style={{
                backgroundColor: `${cat.color}15`,
                borderColor: `${cat.color}30`,
                color: cat.color,
              }}
              whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${cat.color}40` }}
            >
              {cat.name}
            </motion.span>
          ))}
        </motion.div>
        <p className="text-muted-foreground text-xs mt-4 text-center">
          {t('kog.detection')}
        </p>
      </GlassCard>
    </SectionShell>
  )
}

// ─── Bingo Preview (two-player demo) ─────────────────────────────────────────

const BINGO_GRID = 5
const BINGO_TOTAL = BINGO_GRID * BINGO_GRID
const BINGO_MAPS = [
  'Kobra 4', 'Sunny Side Up', 'Multeasymap', 'Back in Time 2', 'Absurd 3',
  'Stronghold', 'Crimson', 'Frozen', 'Grandma', 'Jungle Run',
  'Just2Easy', 'Binary', 'LearnToPlay', 'Linear', 'Moonlight',
  'Naufrage 3', 'Orange 1', 'Springlobe 3', 'StepByStep', 'Tsunami',
  'Tutorial', 'Wasteland', 'Autumn', 'Castle', 'Zenith',
]

// Blue player completes diagonal + scatter, Red player scatters around
const BLUE_SCATTER = [3, 17, 8]
const BLUE_DIAGONAL = [0, 6, 12, 18, 24]
const RED_CELLS = [1, 9, 14, 22, 7, 16]
// Interleave: blue, red, blue, red...
const BINGO_SEQUENCE: { cell: number; player: 'blue' | 'red' }[] = [
  { cell: 3, player: 'blue' },
  { cell: 1, player: 'red' },
  { cell: 17, player: 'blue' },
  { cell: 9, player: 'red' },
  { cell: 8, player: 'blue' },
  { cell: 14, player: 'red' },
  // Blue starts winning diagonal
  { cell: 0, player: 'blue' },
  { cell: 22, player: 'red' },
  { cell: 6, player: 'blue' },
  { cell: 7, player: 'red' },
  { cell: 12, player: 'blue' },
  { cell: 16, player: 'red' },
  { cell: 18, player: 'blue' },
  { cell: 24, player: 'blue' }, // Blue wins!
]

type BingoPhase = 'playing' | 'celebrating' | 'resetting'

export function BingoPreviewSection() {
  const t = useTranslations('home')
  const [skins] = useState(() => pickRandomSkins(2, 42))
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { amount: 0.3 })
  const [cells, setCells] = useState<Map<number, 'blue' | 'red'>>(new Map())
  const [phase, setPhase] = useState<BingoPhase>('playing')
  const [stepIndex, setStepIndex] = useState(0)
  const [latestCell, setLatestCell] = useState<number | null>(null)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const confettiFiredRef = useRef(false)

  const handleImageError = useCallback((position: number) => {
    setFailedImages((prev) => { const next = new Set(prev); next.add(position); return next })
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setCells(new Map())
    setPhase('playing')
    setStepIndex(0)
    setLatestCell(null)
    confettiFiredRef.current = false
  }, [clearTimers])

  // Main animation loop
  useEffect(() => {
    if (!isInView || phase !== 'playing' || stepIndex >= BINGO_SEQUENCE.length) return
    const timer = setTimeout(() => {
      const { cell, player } = BINGO_SEQUENCE[stepIndex]
      setLatestCell(cell)
      setCells((prev) => new Map(prev).set(cell, player))
      if (stepIndex === BINGO_SEQUENCE.length - 1) {
        setPhase('celebrating')
      } else {
        setStepIndex((i) => i + 1)
      }
    }, stepIndex === 0 ? 800 : 550)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [isInView, phase, stepIndex])

  // Celebration
  useEffect(() => {
    if (phase !== 'celebrating' || confettiFiredRef.current) return
    confettiFiredRef.current = true
    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#60a5fa', '#93c5fd'] })
      setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.3 }, colors: ['#3b82f6', '#60a5fa'] }), 300)
    })
    const timer = setTimeout(() => setPhase('resetting'), 3000)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase])

  // Reset
  useEffect(() => {
    if (phase !== 'resetting') return
    const timer = setTimeout(reset, 1000)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase, reset])

  useEffect(() => { if (!isInView) clearTimers() }, [isInView, clearTimers])
  useEffect(() => () => clearTimers(), [clearTimers])

  const winSet = new Set(BLUE_DIAGONAL)
  const allWinningDone = phase === 'celebrating' || phase === 'resetting'

  // Determine which player is "active" (last move)
  const activePlayer = stepIndex > 0 ? BINGO_SEQUENCE[Math.min(stepIndex, BINGO_SEQUENCE.length - 1)].player : 'blue'

  return (
    <SectionShell className="max-w-[620px]" ref={containerRef}>
      <h2 className="text-3xl font-bold text-foreground mb-4 text-center">{t('bingo.title')}</h2>

      {/* Two opponents */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-2">
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all', activePlayer === 'blue' ? 'bg-blue-500/20 ring-1 ring-blue-500/40' : 'opacity-60')}>
          <TeeAvatarWithFallback skinUrl={getDDNetSkinUrl(skins[0])} size="sm" lookAtCursor />
          <div>
            <div className="text-foreground text-xs font-semibold">{t('bingo.player1')}</div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-[10px]">{[...cells.values()].filter((v) => v === 'blue').length} {t('bingo.cells')}</span>
            </div>
          </div>
        </div>
        <span className="text-muted-foreground text-xs font-bold text-center">VS</span>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all', activePlayer === 'red' ? 'bg-red-500/20 ring-1 ring-red-500/40' : 'opacity-60')}>
          <div>
            <div className="text-foreground text-xs font-semibold text-right">{t('bingo.player2')}</div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-red-400 text-[10px]">{[...cells.values()].filter((v) => v === 'red').length} {t('bingo.cells')}</span>
              <span className="size-2 rounded-full bg-red-500" />
            </div>
          </div>
          <TeeAvatarWithFallback skinUrl={getDDNetSkinUrl(skins[1])} size="sm" lookAtCursor />
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5 sm:gap-2 mx-auto max-w-md"
        style={{
          gridTemplateColumns: `repeat(${BINGO_GRID}, minmax(0, 1fr))`,
          aspectRatio: '1',
        }}
      >
        {Array.from({ length: BINGO_TOTAL }).map((_, i) => {
          const player = cells.get(i)
          const isDone = !!player
          const isNew = latestCell === i && isDone
          const isWinCell = winSet.has(i)
          const isWinning = allWinningDone && isWinCell && player === 'blue'
          const mapName = BINGO_MAPS[i] || '?'
          const thumbUrl = `/maps/${mapName.replace(/ /g, '_')}.png`
          const imgFailed = failedImages.has(i)

          const cellBg = player === 'blue'
            ? 'bg-blue-500/25 border-blue-500'
            : player === 'red'
              ? 'bg-red-500/25 border-red-500'
              : 'bg-muted border-border'

          const overlayBg = player === 'blue'
            ? 'bg-blue-500/60'
            : player === 'red'
              ? 'bg-red-500/60'
              : 'bg-black/55'

          return (
            <motion.div
              key={i}
              className={cn(
                'aspect-square rounded-md sm:rounded-lg border flex items-center justify-center text-[6px] sm:text-[8px] font-mono overflow-hidden relative',
                cellBg,
              )}
              animate={
                isWinning
                  ? { opacity: [0.7, 1, 0.7] }
                  : isNew
                    ? { scale: [1, 1.15, 1] }
                    : {}
              }
              transition={
                isWinning
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : isNew
                    ? { duration: 0.35, ease: 'easeOut' }
                    : {}
              }
            >
              {/* Map thumbnail background */}
              {!imgFailed && (
                <>
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${thumbUrl})` }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl} alt="" onError={() => handleImageError(i)} className="hidden" />
                </>
              )}
              <div className={cn('absolute inset-0 z-1', overlayBg)} />
              <div className="absolute inset-0 z-10 flex items-center justify-center p-0.5">
                {isDone ? (
                  <Trophy className={cn('size-3 sm:size-3.5', player === 'blue' ? 'text-blue-200' : 'text-red-200')} />
                ) : (
                  <span className="text-muted-foreground font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight line-clamp-2 text-center">
                    {mapName}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Score comparison bar */}
      <div className="mt-4 px-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
          <span className="text-blue-400">{[...cells.values()].filter((v) => v === 'blue').length}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
            <motion.div
              className="h-full bg-blue-500 rounded-l-full"
              animate={{ width: `${([...cells.values()].filter((v) => v === 'blue').length / BINGO_TOTAL) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            <div className="flex-1" />
            <motion.div
              className="h-full bg-red-500 rounded-r-full"
              animate={{ width: `${([...cells.values()].filter((v) => v === 'red').length / BINGO_TOTAL) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-red-400">{[...cells.values()].filter((v) => v === 'red').length}</span>
        </div>
      </div>
    </SectionShell>
  )
}

// ─── Race Preview (two-player demo) ─────────────────────────────────────────
// Each map is claimed by ONE player (first to finish it). Winner = most maps claimed.

const RACE_MAPS = ['Kobra 4', 'Binary', 'Crimson', 'Just2Easy', 'Stronghold', 'Multeasymap', 'Back in Time 2', 'Zenith']

// Each step: one player claims one map. A map can only be claimed once.
// Emerald wins 5-3.
const RACE_SEQUENCE: { map: number; player: 'emerald' | 'orange' }[] = [
  { map: 0, player: 'emerald' },
  { map: 1, player: 'orange' },
  { map: 2, player: 'emerald' },
  { map: 3, player: 'orange' },
  { map: 4, player: 'emerald' },
  { map: 5, player: 'emerald' },
  { map: 6, player: 'orange' },
  { map: 7, player: 'emerald' }, // Emerald wins 5-3
]

type RacePhase = 'playing' | 'celebrating' | 'resetting'

export function RacePreviewSection() {
  const t = useTranslations('home')
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { amount: 0.3 })
  const [cells, setCells] = useState<Map<number, 'emerald' | 'orange'>>(new Map())
  const [phase, setPhase] = useState<RacePhase>('playing')
  const [stepIndex, setStepIndex] = useState(0)
  const [latestMap, setLatestMap] = useState<number | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const confettiFiredRef = useRef(false)

  const clearTimers = useCallback(() => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }, [])

  const reset = useCallback(() => {
    clearTimers()
    setCells(new Map())
    setPhase('playing')
    setStepIndex(0)
    setLatestMap(null)
    confettiFiredRef.current = false
  }, [clearTimers])

  useEffect(() => {
    if (!isInView || phase !== 'playing' || stepIndex >= RACE_SEQUENCE.length) return
    const timer = setTimeout(() => {
      const { map, player } = RACE_SEQUENCE[stepIndex]
      setLatestMap(map)
      setCells((prev) => new Map(prev).set(map, player))
      if (stepIndex === RACE_SEQUENCE.length - 1) setPhase('celebrating')
      else setStepIndex((i) => i + 1)
    }, stepIndex === 0 ? 800 : 650)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [isInView, phase, stepIndex])

  useEffect(() => {
    if (phase !== 'celebrating' || confettiFiredRef.current) return
    confettiFiredRef.current = true
    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#10b981', '#6ee7b7'] })
    })
    const timer = setTimeout(() => setPhase('resetting'), 3000)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => { if (phase === 'resetting') { const t = setTimeout(reset, 1000); timersRef.current.push(t); return () => clearTimeout(t) } }, [phase, reset])
  useEffect(() => { if (!isInView) clearTimers() }, [isInView, clearTimers])
  useEffect(() => () => clearTimers(), [clearTimers])

  const emeraldCount = [...cells.values()].filter((v) => v === 'emerald').length
  const orangeCount = [...cells.values()].filter((v) => v === 'orange').length
  const activePlayer = stepIndex > 0 ? RACE_SEQUENCE[Math.min(stepIndex, RACE_SEQUENCE.length - 1)].player : 'emerald'
  const done = phase === 'celebrating' || phase === 'resetting'

  return (
    <SectionShell className="max-w-[520px]" ref={containerRef}>
      <h2 className="text-3xl font-bold text-foreground mb-4 text-center">{t('race.title')}</h2>

      {/* Two opponents */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-2">
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all', activePlayer === 'emerald' ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : 'opacity-60')}>
          <TeeAvatarWithFallback skinUrl={getDDNetSkinUrl('limekitty')} size="sm" lookAtCursor />
          <div>
            <div className="text-foreground text-xs font-semibold">{t('race.player1')}</div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 text-[10px]">{emeraldCount} {t('race.maps')}</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          {done
            ? <span className="text-emerald-400 text-xs font-bold">{t('race.wins', { name: t('race.player1') })}</span>
            : <span className="text-muted-foreground text-xs font-bold">VS</span>
          }
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all', activePlayer === 'orange' ? 'bg-orange-500/20 ring-1 ring-orange-500/40' : 'opacity-60')}>
          <div>
            <div className="text-foreground text-xs font-semibold text-right">{t('race.player2')}</div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-orange-400 text-[10px]">{orangeCount} {t('race.maps')}</span>
              <span className="size-2 rounded-full bg-orange-500" />
            </div>
          </div>
          <TeeAvatarWithFallback skinUrl={getDDNetSkinUrl('saddo')} size="sm" lookAtCursor />
        </div>
      </div>

      {/* Race nodes — each claimed by one player */}
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
        {RACE_MAPS.map((mapName, i) => {
          const owner = cells.get(i)
          const isNew = latestMap === i

          const borderColor = owner === 'emerald'
            ? 'border-emerald-500'
            : owner === 'orange'
              ? 'border-orange-500'
              : 'border-border'

          const bgColor = owner === 'emerald'
            ? 'bg-emerald-500/20'
            : owner === 'orange'
              ? 'bg-orange-500/20'
              : 'bg-muted'

          return (
            <motion.div
              key={i}
              className={cn('aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 relative overflow-hidden', borderColor, bgColor)}
              animate={isNew ? { scale: [1, 1.1, 1] } : {}}
              transition={isNew ? { duration: 0.3 } : {}}
            >
              {owner && (
                <Trophy className={cn('size-4', owner === 'emerald' ? 'text-emerald-400' : 'text-orange-400')} />
              )}
              <span className="text-muted-foreground text-[9px] font-medium text-center leading-tight px-1 line-clamp-2">
                {mapName}
              </span>
              <span className="absolute top-1 left-1.5 text-muted-foreground text-[8px] font-mono">{i + 1}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress track */}
      <div className="mt-4 px-2">
        <div className="flex items-center gap-1">
          {RACE_MAPS.map((_, i) => {
            const owner = cells.get(i)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  'w-full h-2 rounded-full transition-colors duration-300',
                  owner === 'emerald' ? 'bg-emerald-500' : owner === 'orange' ? 'bg-orange-500' : 'bg-muted',
                )} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-emerald-400">{emeraldCount} maps</span>
          <span className="text-orange-400">{orangeCount} maps</span>
        </div>
      </div>
    </SectionShell>
  )
}

// ─── Download ────────────────────────────────────────────────────────────────

const DOWNLOAD_FEATURE_KEYS = [
  'download.features.createGames',
  'download.features.overlay',
  'download.features.autoJoin',
  'download.features.detection',
] as const

export function DownloadSection() {
  const t = useTranslations('home')
  return (
    <SectionShell className="max-w-[560px]">
      <h2 className="text-3xl font-bold text-foreground mb-2">{t('download.title')}</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {t('download.description')}
      </p>

      {/* Mini client window mockup */}
      <div className="rounded-xl border border-white/10 overflow-hidden mb-4 bg-[#0d1117]">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/5">
          <span className="size-2.5 rounded-full bg-red-500/70" />
          <span className="size-2.5 rounded-full bg-yellow-500/70" />
          <span className="size-2.5 rounded-full bg-green-500/70" />
          <span className="text-muted-foreground text-[10px] ml-2 font-mono">DDashBoard Client v1.0</span>
        </div>
        {/* Fake client UI — mini bingo grid */}
        <div className="p-3">
          <div className="grid grid-cols-5 gap-1 max-w-[180px] mx-auto">
            {Array.from({ length: 25 }).map((_, i) => {
              const done = [0, 3, 6, 8, 12, 14, 18, 21, 24].includes(i)
              return (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-sm',
                    done ? 'bg-orange-500/40 border border-orange-500/50' : 'bg-white/5 border border-white/5',
                  )}
                />
              )
            })}
          </div>
          <p className="text-muted-foreground text-[9px] text-center mt-2 font-mono">Bingo 5×5 — Novice</p>
        </div>
      </div>

      <GlassCard accent="#f97316">
        <motion.div
          className="space-y-3 mb-5"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {DOWNLOAD_FEATURE_KEYS.map((key) => (
            <motion.div key={key} variants={slideLeft} className="flex items-center gap-2 text-sm text-foreground">
              <ChevronRight className="size-4 text-orange-400 shrink-0" />
              {t(key)}
            </motion.div>
          ))}
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: Monitor, label: 'Windows' },
            { icon: Terminal, label: 'Linux' },
            { icon: Apple, label: 'macOS' },
          ].map(({ icon: Icon, label }) => (
            <motion.div key={label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" variant="outline" className="w-full bg-orange-500/15 border-orange-500/30 text-orange-200 hover:bg-orange-500/25 gap-1.5">
                <Icon className="size-3.5" />
                {label}
              </Button>
            </motion.div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs mt-3 text-center animate-[pulse_3s_ease_infinite]">{t('download.comingSoon')}</p>
      </GlassCard>
    </SectionShell>
  )
}

// ─── Community ──────────────────────────────────────────────────────────────

const DISCORD_FALLBACK = 'https://discord.gg/DghtpdvySM'

export function CommunitySection() {
  const t = useTranslations('home')
  const { data } = useSWR('/api/globals/about-page?depth=0', aboutFetcher)

  // Get discord URL from CMS contact links, fallback to hardcoded
  const discordLink = data?.contact?.links?.find((l: any) => l.platform === 'discord')
  const discordUrl = discordLink?.value?.startsWith('http')
    ? discordLink.value
    : discordLink?.value
      ? `https://discord.gg/${discordLink.value}`
      : DISCORD_FALLBACK

  return (
    <SectionShell className="max-w-[520px]">
      <h2 className="text-3xl font-bold text-foreground mb-2">{t('community.title')}</h2>
      <p className="text-muted-foreground text-sm mb-5">
        {t('community.description')}
      </p>
      <GlassCard accent="#5865F2" hover>
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
            <MessageCircle className="size-6 text-[#5865F2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-semibold text-lg">{t('community.discordTitle')}</h3>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-green-500" />
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{t('community.discordDesc')}</p>
          </div>
        </div>
        <Button size="sm" className="w-full mt-4 bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer">
            {t('community.joinDiscord')}
            <ExternalLink className="size-3 ml-1.5" />
          </a>
        </Button>
      </GlassCard>
      <p className="text-muted-foreground text-xs mt-4 text-center">
        {t('community.powered')}
      </p>
    </SectionShell>
  )
}

// ─── Team ───────────────────────────────────────────────────────────────────

const aboutFetcher = (url: string) => fetch(url).then((r) => r.json())

export function TeamSection({ locale }: { locale: string }) {
  const t = useTranslations('home')
  const { data } = useSWR(`/api/globals/about-page?depth=0&locale=${locale}`, aboutFetcher)

  const members: any[] = []
  if (data?.teamSections) {
    for (const section of data.teamSections) {
      if (section.members) members.push(...section.members)
    }
  }

  const lead = members[0]
  const rest = members.slice(1, 7)
  const remaining = Math.max(0, members.length - 7)

  return (
    <SectionShell className="max-w-[500px]">
      <h2 className="text-3xl font-bold text-foreground mb-4">{t('team.title')}</h2>

      {lead ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="space-y-3"
        >
          {/* Lead member — hero style */}
          <motion.div variants={fadeUp}>
            <GlassCard accent="#f59e0b">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-amber-500/20 blur-xl" />
                  <TeeAvatarWithFallback
                    skinUrl={lead.skinName ? getDDNetSkinUrl(lead.skinName) : undefined}
                    bodyColor={lead.skinColorBody}
                    feetColor={lead.skinColorFeet}
                    useCustomColors={!!(lead.skinColorBody || lead.skinColorFeet)}
                    size="xl"
                    lookAtCursor
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{lead.name}</h3>
                  {lead.title && (
                    <Badge
                      className="mt-1 text-xs"
                      style={{
                        backgroundColor: `${lead.titleColor || '#f59e0b'}20`,
                        color: lead.titleColor || '#f59e0b',
                      }}
                    >
                      {lead.title}
                    </Badge>
                  )}
                </div>
                {lead.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{lead.description}</p>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Rest of team — compact row */}
          {rest.length > 0 && (
            <motion.div variants={fadeUp}>
              <GlassCard>
                <div className="space-y-2">
                  {rest.map((m: any, i: number) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 px-2 py-1.5"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07, duration: 0.35 }}
                    >
                      <TeeAvatarWithFallback
                        skinUrl={m.skinName ? getDDNetSkinUrl(m.skinName) : undefined}
                        bodyColor={m.skinColorBody}
                        feetColor={m.skinColorFeet}
                        useCustomColors={!!(m.skinColorBody || m.skinColorFeet)}
                        size="md"
                        lookAtCursor
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground text-sm font-medium truncate block">{m.name}</span>
                        {m.title && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full border inline-block mt-0.5"
                            style={{
                              borderColor: `${m.titleColor || '#6b7280'}40`,
                              color: m.titleColor || '#6b7280',
                            }}
                          >
                            {m.title}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                {remaining > 0 && (
                  <p className="text-muted-foreground text-xs text-center mt-3">+{remaining} more</p>
                )}
              </GlassCard>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link href={`/${locale}/about`}>
                {t('team.meetFull')}
                <ExternalLink className="size-3 ml-1.5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <GlassCard>
          <div className="flex items-center justify-center py-6">
            <div className="size-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        </GlassCard>
      )}
    </SectionShell>
  )
}

// ─── Footer (merged About + Footer) ─────────────────────────────────────────

export function FooterSection({ locale }: { locale: string }) {
  const t = useTranslations('home')
  const navLinks = [
    { href: `/${locale}/about`, label: t('footer.about') },
    { href: `/${locale}/rules`, label: t('footer.rules') },
    { href: '/support', label: t('footer.support') },
    { href: `/${locale}/terms`, label: t('footer.terms') },
    { href: `/${locale}/privacy`, label: t('footer.privacy') },
  ]

  return (
    <SectionShell className="max-w-[620px]">
      {/* Free & Open Source */}
      <GlassCard className="relative overflow-hidden mb-3">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 via-emerald-500/10 to-green-500/20 animate-[gradient-shift_4s_ease_infinite] bg-[length:200%_200%] pointer-events-none" />
        <div className="relative flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-500/15 shrink-0">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="size-4 text-green-400" />
            </motion.div>
          </div>
          <div>
            <h3 className="text-foreground font-semibold mb-1">{t('footer.freeTitle')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('footer.freeDesc')}
            </p>
          </div>
        </div>
        <div className="relative flex flex-col gap-2">
          <Button size="sm" asChild className="w-full">
            <Link href={`/${locale}/about`}>{t('footer.learnMore')}</Link>
          </Button>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <a href="https://ddnet.org" target="_blank" rel="noopener noreferrer">DDNet.org</a>
          </Button>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <a href="https://github.com/DDashBoard" target="_blank" rel="noopener noreferrer">
              <Github className="size-3.5 mr-1" />
              GitHub
            </a>
          </Button>
        </div>
      </GlassCard>

      {/* Footer */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Grid3x3 className="size-5 text-accent" />
          </motion.div>
          <span className="font-bold text-foreground text-lg">DDashBoard</span>
        </div>
        <motion.div
          className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {navLinks.map((link) => (
            <motion.div key={link.label} variants={fadePill}>
              <Link href={link.href} className="hover:text-foreground hover:underline transition-colors">{link.label}</Link>
            </motion.div>
          ))}
        </motion.div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.powered')}</span>
        </div>
      </GlassCard>
    </SectionShell>
  )
}
