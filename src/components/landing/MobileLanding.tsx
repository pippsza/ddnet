'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Image, Zap } from 'lucide-react'
import {
  HeroSection,
  DDNetModesSection,
  BingoPreviewSection,
  KoGModesSection,
  RacePreviewSection,
  DownloadSection,
  CommunitySection,
  TeamSection,
  FooterSection,
} from './LandingSections'
import { MobileFeatures } from './MobileFeatures'
import { MapScroller } from './MapScroller'
import { getPreset, DEFAULT_PRESET } from './map-presets'
import type { CameraPoint } from './types'

interface MobileLandingProps {
  locale: string
}

// Slow vertical drift for mobile parallax bg
const MOBILE_BG_PATH: CameraPoint[] = [
  { progress: 0, x: 5000, y: 3000 },
  { progress: 1, x: 9000, y: 5500 },
]

const SECTION_COUNT = 10

// Fade-in wrapper
function MobileSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Horizontal scroll progress bar at bottom
function ScrollProgress({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <div className="flex gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2 py-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === activeIndex ? 16 : 6,
            backgroundColor: i === activeIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </div>
  )
}

type RenderMode = 'quality' | 'medium' | 'performance'

export function MobileLanding({ locale }: MobileLandingProps) {
  const [mode, setMode] = useState<RenderMode>('medium')
  const [activeSection, setActiveSection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const preset = getPreset(DEFAULT_PRESET)

  useEffect(() => {
    setMode((localStorage.getItem('landing-render-mode') as RenderMode) || 'medium')
  }, [])


  const handleModeChange = useCallback((m: RenderMode, e?: React.MouseEvent) => {
    if (m === mode) return
    const apply = () => {
      setMode(m)
      localStorage.setItem('landing-render-mode', m)
    }
    if ('startViewTransition' in document) {
      const cx = e ? ((e.clientX / window.innerWidth) * 100).toFixed(0) : '50'
      const cy = e ? ((e.clientY / window.innerHeight) * 100).toFixed(0) : '90'
      const styleId = `mode-transition-${Date.now()}`
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        ::view-transition-old(root) { animation: none; }
        ::view-transition-new(root) {
          animation: mode-circle-expand 0.5s ease-out;
        }
        @keyframes mode-circle-expand {
          from { clip-path: circle(0% at ${cx}% ${cy}%); filter: blur(4px); }
          to { clip-path: circle(150% at ${cx}% ${cy}%); filter: blur(0); }
        }
      `
      document.head.appendChild(style)
      setTimeout(() => document.getElementById(styleId)?.remove(), 2000)
      ;(document as any).startViewTransition(apply)
    } else {
      apply()
    }
  }, [mode])

  // Track which section is visible
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const sections = container.querySelectorAll('[data-section]')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-section'))
            if (!isNaN(idx)) setActiveSection(idx)
          }
        }
      },
      { threshold: 0.3 },
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const showTiles = mode !== 'performance' && preset.tiles

  return (
    <div className="relative overflow-x-hidden">
      {/* Tile parallax background */}
      {showTiles && (
        <div className="fixed inset-0 z-0">
          <MapScroller
            mapWidth={preset.tiles!.mapWidth}
            mapHeight={preset.tiles!.mapHeight}
            tileSize={preset.tiles!.tileSize}
            tilesX={preset.tiles!.tilesX}
            tilesY={preset.tiles!.tilesY}
            tileUrl={(r, c) => `/map-tiles/${preset.tiles!.tileDir}/tile-${r}-${c}.webp`}
            placeholderUrl={`/map-tiles/${preset.tiles!.tileDir}/placeholder.webp`}
            path={MOBILE_BG_PATH}
            scrollMultiplier={1}
            noSpacer
          />
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        </div>
      )}

      {/* Sections */}
      <div ref={containerRef} className="relative z-10 flex flex-col gap-12 px-4 py-20 pb-16 max-w-md mx-auto">
        <div data-section={0}>
          <MobileSection>
            <HeroSection locale={locale} />
          </MobileSection>
        </div>

        <div data-section={1}>
          <MobileSection>
            <MobileFeatures />
          </MobileSection>
        </div>

        <div data-section={2}>
          <MobileSection>
            <DDNetModesSection />
          </MobileSection>
        </div>

        <div data-section={3}>
          <MobileSection>
            <BingoPreviewSection />
          </MobileSection>
        </div>

        <div data-section={4}>
          <MobileSection>
            <KoGModesSection />
          </MobileSection>
        </div>

        <div data-section={5}>
          <MobileSection>
            <RacePreviewSection />
          </MobileSection>
        </div>

        <div data-section={6}>
          <MobileSection>
            <DownloadSection />
          </MobileSection>
        </div>

        <div data-section={7}>
          <MobileSection>
            <CommunitySection />
          </MobileSection>
        </div>

        <div data-section={8}>
          <MobileSection>
            <TeamSection locale={locale} />
          </MobileSection>
        </div>

        <div data-section={9}>
          <MobileSection>
            <FooterSection locale={locale} />
          </MobileSection>
        </div>
      </div>

      {/* Bottom controls: mode switcher + progress */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        {/* Render mode switcher */}
        <div className="flex gap-1 bg-black/50 backdrop-blur-md rounded-full p-1">
          {([
            { m: 'quality' as const, icon: Sparkles },
            { m: 'medium' as const, icon: Image },
            { m: 'performance' as const, icon: Zap },
          ]).map(({ m, icon: Icon }) => (
            <button
              key={m}
              onClick={(e) => handleModeChange(m, e)}
              className={`p-1.5 rounded-full transition-all ${
                mode === m
                  ? 'bg-[#1a6b3c] text-[#d4f4e0]'
                  : 'text-white/40'
              }`}
            >
              <Icon className="size-3" />
            </button>
          ))}
        </div>
        {/* Section progress dots */}
        <ScrollProgress count={SECTION_COUNT} activeIndex={activeSection} />
      </div>
    </div>
  )
}
