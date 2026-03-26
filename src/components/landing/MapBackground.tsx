'use client'

import { MapCanvas } from './MapCanvas'
import { MapScroller } from './MapScroller'
import type { CameraPoint } from './types'
import { getPreset, DEFAULT_PRESET } from './map-presets'
import { useRenderMode } from '@/hooks/useRenderMode'

// Slow horizontal drift path for info/auth/app page backgrounds
// Uses same coordinate system as map-presets stops (works for both WebGL and tiles)
const BG_PATH: CameraPoint[] = [
  { progress: 0, x: 8200, y: 4500 },
  { progress: 1, x: 13000, y: 3800 },
]

const BG_SCROLL_MULTIPLIER = 3

/**
 * Map background with parallax drift for info/auth/app pages.
 * Both renderers stay mounted (hidden when inactive) so switching is instant.
 * Quality: lazy-mount WebGL, keep alive once loaded.
 */
export function MapBackground() {
  const { renderMode, qualityEverUsed } = useRenderMode()
  const preset = getPreset(DEFAULT_PRESET)

  return (
    <>
      {/* Quality — WebGL, lazy-mount, keep alive */}
      {qualityEverUsed && (
        <div className="fixed inset-0 z-0" style={{ display: renderMode === 'quality' ? 'block' : 'none' }}>
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
        <div className="fixed inset-0 z-0" style={{ display: renderMode === 'medium' ? 'block' : 'none' }}>
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
    </>
  )
}
