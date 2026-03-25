'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap } from 'lucide-react'
import { MapCanvas } from './MapCanvas'
import { MapScroller } from './MapScroller'
import { MapSection } from './MapSection'
import { MapNavbar } from './MapNavbar'
import {
  HeroSection,
  FeaturesSection,
  DDNetModesSection,
  BingoPreviewSection,
  KoGModesSection,
  RacePreviewSection,
  DownloadSection,
  CommunitySection,
  TeamSection,
  FooterSection,
} from './LandingSections'
import { getPreset, getCameraPath, getSections, getNavItems, getAllPresetIds, DEFAULT_PRESET } from './map-presets'

type RenderMode = 'quality' | 'performance'

interface DesktopLandingProps {
  isLoggedIn: boolean
  locale: string
}

// Preload WebGL scripts + map file for faster Quality mode loading
const PRELOAD_SCRIPTS = [
  '/mappreview/jquery-1.10.2.min.js',
  '/mappreview/gl-matrix.js',
  '/mappreview/twdatafile.js',
  '/mappreview/twwebgl.js',
]

export function DesktopLanding({ isLoggedIn, locale }: DesktopLandingProps) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET)
  const [renderMode, setRenderMode] = useState<RenderMode>(() => {
    if (typeof window === 'undefined') return 'quality'
    return (localStorage.getItem('landing-render-mode') as RenderMode) || 'quality'
  })
  const [isTransitioning, setIsTransitioning] = useState(false)
  // Track if Quality was ever used — lazy-mount WebGL, keep alive once loaded
  const [qualityEverUsed, setQualityEverUsed] = useState(renderMode === 'quality')
  const handleRenderModeChange = useCallback((mode: RenderMode) => {
    if (mode === renderMode) return
    setIsTransitioning(true)
    setTimeout(() => {
      setRenderMode(mode)
      localStorage.setItem('landing-render-mode', mode)
      if (mode === 'quality') setQualityEverUsed(true)
      setTimeout(() => setIsTransitioning(false), 100)
    }, 400)
  }, [renderMode])

  // Inject preload hints only in quality mode
  useEffect(() => {
    if (renderMode !== 'quality') return
    const links: HTMLLinkElement[] = []
    for (const src of PRELOAD_SCRIPTS) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = src
      document.head.appendChild(link)
      links.push(link)
    }
    const mapLink = document.createElement('link')
    mapLink.rel = 'preload'
    mapLink.as = 'fetch'
    mapLink.href = `/mappreview/${encodeURIComponent('Lavender Forest')}.map`
    mapLink.crossOrigin = 'anonymous'
    document.head.appendChild(mapLink)
    links.push(mapLink)
    return () => { links.forEach((l) => l.remove()) }
  }, [renderMode])

  const preset = getPreset(presetId)
  const s = getSections(preset)
  const cameraPath = getCameraPath(preset)
  const navItems = getNavItems(preset)

  const sections: ReactNode = (
    <>
      <MapSection x={s.hero.x} y={s.hero.y} width={550} immediate>
        <HeroSection locale={locale} />
      </MapSection>

      <MapSection x={s.features.x} y={s.features.y} width={850} animateFrom="left" delay={0.1}>
        <FeaturesSection />
      </MapSection>

      <MapSection x={s.ddnet.x} y={s.ddnet.y} width={550} animateFrom="right" delay={0.1}>
        <DDNetModesSection />
      </MapSection>

      <MapSection x={s.bingo.x} y={s.bingo.y} width={680} animateFrom="bottom" delay={0.15}>
        <BingoPreviewSection />
      </MapSection>

      <MapSection x={s.kog.x} y={s.kog.y} width={600} animateFrom="left" delay={0.1}>
        <KoGModesSection />
      </MapSection>

      <MapSection x={s.race.x} y={s.race.y} width={580} animateFrom="bottom" delay={0.15}>
        <RacePreviewSection />
      </MapSection>

      <MapSection x={s.download.x} y={s.download.y} width={620} animateFrom="right" delay={0.1}>
        <DownloadSection />
      </MapSection>

      <MapSection x={s.community.x} y={s.community.y} width={580} animateFrom="left" delay={0.1}>
        <CommunitySection />
      </MapSection>

      <MapSection x={s.team.x} y={s.team.y} width={580} animateFrom="right" delay={0.1}>
        <TeamSection locale={locale} />
      </MapSection>

      <MapSection x={s.footer.x} y={s.footer.y} width={680} animateFrom="bottom" delay={0.1}>
        <FooterSection locale={locale} />
      </MapSection>
    </>
  )

  return (
    <>
      <MapNavbar
        items={navItems}
        scrollMultiplier={preset.scrollMultiplier}
        isLoggedIn={isLoggedIn}
        locale={locale}
      />

      <BottomPanel
        presetId={presetId}
        onPresetChange={setPresetId}
        renderMode={renderMode}
        onRenderModeChange={handleRenderModeChange}
      />

      {/* Gradient overlay for mode transitions */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="mode-transition"
            className="fixed inset-0 z-30 bg-linear-to-b from-[#2a1f4e] via-[#1a1040] to-[#0a0f14]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/*
        Quality: lazy-mount on first use, then keep alive (hidden when inactive).
        Performance: always mounted (tiles are lightweight).
        This way WebGL only loads if user actually picks Quality, but once loaded — cached.
      */}
      {/*
        Quality: lazy-mount, keep alive once loaded (WebGL cached in DOM).
        Performance: always available.
        Sections rendered only inside the ACTIVE renderer to avoid duplicate timers/fetches.
        Inactive renderer stays mounted but empty (just the map background).
      */}
      {qualityEverUsed && (
        <div style={{ display: renderMode === 'quality' ? 'contents' : 'none' }}>
          <MapCanvas
            mapName={preset.mapFile}
            path={cameraPath}
            scrollMultiplier={preset.scrollMultiplier}
            placeholderUrl={preset.tiles ? `/map-tiles/${preset.tiles.tileDir}/placeholder.webp` : undefined}
            debugStops={preset.stops}
          >
            {renderMode === 'quality' ? sections : null}
          </MapCanvas>
        </div>
      )}
      <div style={{ display: renderMode === 'performance' ? 'contents' : 'none' }}>
        {preset.tiles ? (
          <MapScroller
            mapWidth={preset.tiles.mapWidth}
            mapHeight={preset.tiles.mapHeight}
            tileSize={preset.tiles.tileSize}
            tilesX={preset.tiles.tilesX}
            tilesY={preset.tiles.tilesY}
            tileUrl={(r, c) => `/map-tiles/${preset.tiles!.tileDir}/tile-${r}-${c}.webp`}
            placeholderUrl={`/map-tiles/${preset.tiles!.tileDir}/placeholder.webp`}
            path={cameraPath}
            scrollMultiplier={preset.scrollMultiplier}
          >
            {renderMode === 'performance' ? sections : null}
          </MapScroller>
        ) : (
          <PerformanceFallback scrollMultiplier={preset.scrollMultiplier}>
            {renderMode === 'performance' ? sections : null}
          </PerformanceFallback>
        )}
      </div>
    </>
  )
}

// ─── Performance Fallback (static background, same scroll + sections) ───────

function PerformanceFallback({
  scrollMultiplier,
  children,
}: {
  scrollMultiplier: number
  children: ReactNode
}) {
  // Same scroll height as MapCanvas, but static dark bg instead of WebGL
  return (
    <>
      <div style={{ height: `${scrollMultiplier * 100}vh` }} />
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-linear-to-b from-[#2a1f4e] via-[#1a1040] to-[#0a0f14]" />

        {/* Sections still render as scroll-positioned overlays */}
        <div
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{ width: 60000, height: 20000, transformOrigin: '0 0', zIndex: 10 }}
        >
          {children}
        </div>
      </div>
    </>
  )
}

// ─── Bottom Panel (render mode + preset switcher) ────────────────────────────

function BottomPanel({
  presetId,
  onPresetChange,
  renderMode,
  onRenderModeChange,
}: {
  presetId: string
  onPresetChange: (id: string) => void
  renderMode: RenderMode
  onRenderModeChange: (mode: RenderMode) => void
}) {
  const ids = getAllPresetIds()
  const showPresets = ids.length > 1

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Render mode toggle */}
      <div className="flex gap-1 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10">
        <button
          onClick={() => onRenderModeChange('quality')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            renderMode === 'quality'
              ? 'bg-primary text-black'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sparkles className="size-3" />
          Quality
        </button>
        <button
          onClick={() => onRenderModeChange('performance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            renderMode === 'performance'
              ? 'bg-primary text-black'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Zap className="size-3" />
          Performance
        </button>
      </div>

      {/* Preset switcher */}
      {showPresets && (
        <div className="flex gap-1.5 bg-black/60 backdrop-blur-md rounded-full p-1.5 border border-white/10">
          {ids.map((id) => {
            const preset = getPreset(id)
            const active = id === presetId
            return (
              <button
                key={id}
                onClick={() => onPresetChange(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-black'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
