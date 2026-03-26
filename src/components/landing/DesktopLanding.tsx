'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRenderMode } from '@/hooks/useRenderMode'
import { MapCanvas } from './MapCanvas'
import { MapScroller } from './MapScroller'
import { MapSection } from './MapSection'
import { MapNavbar } from './MapNavbar'
import { useScrollSnap } from './useScrollSnap'
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
import type { CameraPoint } from './types'
import {
  getPreset,
  getCameraPath,
  getSections,
  getNavItems,
  getAllPresetIds,
  DEFAULT_PRESET,
} from './map-presets'

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
  const { renderMode, qualityEverUsed } = useRenderMode()

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
    return () => {
      links.forEach((l) => l.remove())
    }
  }, [renderMode])

  const preset = getPreset(presetId)
  const s = getSections(preset)
  const cameraPath = getCameraPath(preset)
  const navItems = getNavItems(preset)

  // Snap scroll to nearest section when user stops near one
  const snapPoints = preset.stops.filter((s) => s.section).map((s) => ({ progress: s.progress }))
  useScrollSnap(snapPoints)

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

      <PresetPanel presetId={presetId} onPresetChange={setPresetId} />

      {/*
        Quality (WebGL): lazy-mount, keep alive once loaded.
        Medium (tiles): PNG tiles with viewport culling.
        Performance: static gradient, no map at all.
        Sections only in active renderer to avoid duplicate timers/fetches.
      */}

      {/* Quality — WebGL */}
      {qualityEverUsed && (
        <div style={{ display: renderMode === 'quality' ? 'contents' : 'none' }}>
          <MapCanvas
            mapName={preset.mapFile}
            path={cameraPath}
            scrollMultiplier={preset.scrollMultiplier}
            placeholderUrl={
              preset.tiles ? `/map-tiles/${preset.tiles.tileDir}/placeholder.webp` : undefined
            }
            debugStops={preset.stops}
          >
            {renderMode === 'quality' ? sections : null}
          </MapCanvas>
        </div>
      )}

      {/* Medium — PNG tiles */}
      {preset.tiles && (
        <div style={{ display: renderMode === 'medium' ? 'contents' : 'none' }}>
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
            {renderMode === 'medium' ? sections : null}
          </MapScroller>
        </div>
      )}

      {/* Performance — static gradient, no map */}
      <div style={{ display: renderMode === 'performance' ? 'contents' : 'none' }}>
        <PerformanceFallback scrollMultiplier={preset.scrollMultiplier} path={cameraPath}>
          {renderMode === 'performance' ? sections : null}
        </PerformanceFallback>
      </div>
    </>
  )
}

// ─── Performance Fallback (static background, same scroll + sections) ───────

// Performance mode: no map background at all — just scroll-driven sections
// Reuses MapScroller with transparent background and no tiles
function PerformanceFallback({
  scrollMultiplier,
  path,
  children,
}: {
  scrollMultiplier: number
  path: CameraPoint[]
  children: ReactNode
}) {
  return (
    <MapScroller
      mapWidth={60000}
      mapHeight={20000}
      tileSize={512}
      tilesX={0}
      tilesY={0}
      tileUrl={() => ''}
      path={path}
      scrollMultiplier={scrollMultiplier}
      noBackground
    >
      {children}
    </MapScroller>
  )
}

// ─── Preset Panel (map preset switcher, only when multiple presets) ──────────

function PresetPanel({
  presetId,
  onPresetChange,
}: {
  presetId: string
  onPresetChange: (id: string) => void
}) {
  const ids = getAllPresetIds()
  if (ids.length <= 1) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
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
                  ? 'bg-[#1a6b3c]! text-[#d4f4e0]!'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
