import type { CameraPoint, MapStop } from './types'

export interface MapPreset {
  id: string
  label: string
  /** Map file name for WebGL renderer (without .map extension) */
  mapFile: string
  scrollMultiplier: number
  /**
   * Unified stop list — each stop defines camera position, optional section, and optional nav label.
   * Stops without `section` are scenic waypoints for smoother camera interpolation.
   * Stops without `navLabel` are excluded from the navbar.
   */
  stops: MapStop[]
}

// ─── Helpers — derive old format from stops ──────────────────────────────────

export function getCameraPath(preset: MapPreset): CameraPoint[] {
  return preset.stops.map((s) => ({ progress: s.progress, x: s.camera.x, y: s.camera.y }))
}

export function getSections(
  preset: MapPreset,
): Record<string, { x: number; y: number; width?: number }> {
  const out: Record<string, { x: number; y: number; width?: number }> = {}
  for (const s of preset.stops) {
    if (s.section) out[s.id] = s.section
  }
  return out
}

export function getNavItems(preset: MapPreset): { label: string; scrollTarget: number }[] {
  return preset.stops
    .filter((s) => s.navLabel)
    .map((s) => ({ label: s.navLabel!, scrollTarget: s.progress }))
}

// ─── Lavender Forest ─────────────────────────────────────────────────────────
// Novice 5 by Pipou. Game layer: 1950x300 tiles = 62400x9600 world units.
// Content bounds: x:3264..58592, y:2368..9376.
// Visual density peaks at x:18K-20K and x:41K-43K.
// Y content: upper open area y:2880-4480, dense forest y:6400-9200.

const lavenderForest: MapPreset = {
  id: 'lavender-forest',
  label: 'Lavender Forest',
  mapFile: 'Lavender Forest',
  scrollMultiplier: 12,
  stops: [
    // ── Sections ──
    {
      id: 'hero',
      progress: 0.0,
      camera: { x: 2592, y: 2003 },
      section: { x: 2592, y: 2003 },
      navLabel: 'Home',
    },
    {
      id: 'features',
      progress: 0.1,
      camera: { x: 4824, y: 2871 },
      section: { x: 4824, y: 2871 },
      navLabel: 'Features',
    },
    { id: 'ddnet', progress: 0.2, camera: { x: 5386, y: 4951 }, section: { x: 5386, y: 4951 } },
    { id: 'bingo', progress: 0.3, camera: { x: 8203, y: 5237 }, section: { x: 8203, y: 5237 } },
    {
      id: 'kog',
      progress: 0.4,
      camera: { x: 11287, y: 4362 },
      section: { x: 11287, y: 4362 },
      navLabel: 'KoG',
    },
    { id: 'race', progress: 0.5, camera: { x: 13069, y: 3420 }, section: { x: 13069, y: 3420 } },
    {
      id: 'download',
      progress: 0.6,
      camera: { x: 16554, y: 3145 },
      section: { x: 16554, y: 3145 },
      navLabel: 'Download',
    },
    {
      id: 'community',
      progress: 0.7,
      camera: { x: 17530, y: 5516 },
      section: { x: 17530, y: 5516 },
    },
    { id: 'team', progress: 0.8, camera: { x: 20556, y: 5318 }, section: { x: 20556, y: 5318 } },
    // Scenic waypoint (about section merged into footer)
    { id: 'scenic-about', progress: 0.9, camera: { x: 24670, y: 4473 } },
    { id: 'footer', progress: 1.0, camera: { x: 27298, y: 4404 }, section: { x: 27298, y: 4404 } },

    // ── Scenic waypoints (camera only — add more here for smoother interpolation) ──
  ],
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const MAP_PRESETS: Record<string, MapPreset> = {
  'lavender-forest': lavenderForest,
}

export const DEFAULT_PRESET = 'lavender-forest'

export function getPreset(id: string): MapPreset {
  return MAP_PRESETS[id] || MAP_PRESETS[DEFAULT_PRESET]
}

export function getAllPresetIds(): string[] {
  return Object.keys(MAP_PRESETS)
}
