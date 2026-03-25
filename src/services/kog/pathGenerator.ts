/**
 * KoG Race Path Generator
 * Generates random linear path of KoG maps for race mode
 */

import { isKoGCategory, type KoGCategory } from '@/lib/kog-constants'
import { getKoGMapsByCategory } from './mapProvider'

interface MapInfo {
  mapName: string
  position: number
}

interface PathGeneratorOptions {
  category: string
  pathLength: number
  difficultyMin: number
  difficultyMax: number
}

export async function generateKoGRacePath(options: PathGeneratorOptions): Promise<MapInfo[]> {
  const { category, pathLength, difficultyMin, difficultyMax } = options

  if (!isKoGCategory(category)) {
    throw new Error(`Invalid KoG category: ${category}`)
  }

  const allMaps = await getKoGMapsByCategory(category as KoGCategory)

  const filteredMaps = allMaps.filter(
    (map) => map.difficulty >= difficultyMin && map.difficulty <= difficultyMax,
  )

  if (filteredMaps.length < pathLength) {
    throw new Error(
      `Not enough KoG maps in category ${category} with difficulty ${difficultyMin}-${difficultyMax} stars. Need ${pathLength}, got ${filteredMaps.length}`,
    )
  }

  const shuffled = shuffleArray([...filteredMaps])
  const selected = shuffled.slice(0, pathLength)

  return selected.map((map, index) => ({
    mapName: map.name,
    position: index,
  }))
}

export function validateKoGPathOptions(options: PathGeneratorOptions): {
  valid: boolean
  error?: string
} {
  if (options.pathLength < 3 || options.pathLength > 20) {
    return { valid: false, error: 'Path length must be between 3 and 20' }
  }
  if (options.difficultyMin < 0 || options.difficultyMin > 5) {
    return { valid: false, error: 'Minimum difficulty must be between 0 and 5' }
  }
  if (options.difficultyMax < 0 || options.difficultyMax > 5) {
    return { valid: false, error: 'Maximum difficulty must be between 0 and 5' }
  }
  if (options.difficultyMin > options.difficultyMax) {
    return { valid: false, error: 'Minimum difficulty cannot be greater than maximum' }
  }
  return { valid: true }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
