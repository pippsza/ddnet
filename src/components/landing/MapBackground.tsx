'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Image, Zap } from 'lucide-react'
import { MapCanvas } from './MapCanvas'
import { MapScroller } from './MapScroller'
import type { CameraPoint } from './types'
import { getPreset, DEFAULT_PRESET } from './map-presets'

type RenderMode = 'quality' | 'medium' | 'performance'

// Slow horizontal drift path for info page backgrounds
const BG_PATH: CameraPoint[] = [
  { progress: 0, x: 5000, y: 3500 },
  { progress: 1, x: 8000, y: 4000 },
]

const BG_SCROLL_MULTIPLIER = 3

/**
 * Map background with parallax drift for info pages.
 * Both renderers stay mounted (hidden when inactive) so switching is instant.
 * Quality: lazy-mount WebGL, keep alive once loaded.
 */
export function MapBackground({ hideSwitch }: { hideSwitch?: boolean } = {}) {
  const [mode, setMode] = useState<RenderMode | null>(null)
  const [qualityEverUsed, setQualityEverUsed] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('landing-render-mode') as RenderMode) || 'quality'
    setMode(saved)
    if (saved === 'quality') setQualityEverUsed(true)
  }, [])

  const handleChange = useCallback((m: RenderMode, e?: React.MouseEvent) => {
    if (m === mode) return
    const apply = () => {
      setMode(m)
      localStorage.setItem('landing-render-mode', m)
      if (m === 'quality') setQualityEverUsed(true)
    }

    if ('startViewTransition' in document) {
      const cx = e ? ((e.clientX / window.innerWidth) * 100).toFixed(0) : '90'
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

  const preset = getPreset(DEFAULT_PRESET)

  if (!mode) return null

  return (
    <>
      {/* Quality — WebGL, lazy-mount, keep alive */}
      {qualityEverUsed && (
        <div className="fixed inset-0 z-0" style={{ display: mode === 'quality' ? 'block' : 'none' }}>
          <MapCanvas
            mapName={preset.mapFile}
            path={BG_PATH}
            scrollMultiplier={BG_SCROLL_MULTIPLIER}
            noSpacer
          />
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        </div>
      )}

      {/* Medium — tiles, always mounted */}
      {preset.tiles && (
        <div className="fixed inset-0 z-0" style={{ display: mode === 'medium' ? 'block' : 'none' }}>
          <MapScroller
            mapWidth={preset.tiles.mapWidth}
            mapHeight={preset.tiles.mapHeight}
            tileSize={preset.tiles.tileSize}
            tilesX={preset.tiles.tilesX}
            tilesY={preset.tiles.tilesY}
            tileUrl={(r, c) => `/map-tiles/${preset.tiles!.tileDir}/tile-${r}-${c}.webp`}
            placeholderUrl={`/map-tiles/${preset.tiles!.tileDir}/placeholder.webp`}
            path={BG_PATH}
            scrollMultiplier={BG_SCROLL_MULTIPLIER}
            noSpacer
          />
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        </div>
      )}

      {/* Performance: nothing — standard layout bg shows through */}

      {/* Render mode switcher */}
      {!hideSwitch && <div className="fixed bottom-4 right-4 z-50">
        <div className="flex gap-1 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10">
          {([
            { m: 'quality' as const, icon: Sparkles, label: 'Quality' },
            { m: 'medium' as const, icon: Image, label: 'Medium' },
            { m: 'performance' as const, icon: Zap, label: 'Performance' },
          ]).map(({ m, icon: Icon, label }) => (
            <button
              key={m}
              onClick={(e) => handleChange(m, e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                mode === m
                  ? 'bg-[#1a6b3c]! text-[#d4f4e0]!'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>
      </div>}
    </>
  )
}
