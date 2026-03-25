/**
 * KoG Bingo Grid Generator
 * Generates random maps for a KoG bingo grid from KoG map pool
 */

import { isKoGCategory, type KoGCategory } from '@/lib/kog-constants'
import { getKoGMapsByCategory } from './mapProvider'

interface MapInfo {
  mapName: string
  position: number
  difficulty: number
  points: number
}

interface GridGeneratorOptions {
  category: string
  gridSize: '3x3' | '5x5' | '7x7'
  difficultyMin: number
  difficultyMax: number
}

const GRID_SIZES = {
  '3x3': 9,
  '5x5': 25,
  '7x7': 49,
}

export async function generateKoGBingoGrid(options: GridGeneratorOptions): Promise<MapInfo[]> {
  const { category, gridSize, difficultyMin, difficultyMax } = options
  const count = GRID_SIZES[gridSize]

  if (!isKoGCategory(category)) {
    throw new Error(`Invalid KoG category: ${category}`)
  }

  const allMaps = await getKoGMapsByCategory(category as KoGCategory)

  const filteredMaps = allMaps.filter(
    (map) => map.difficulty >= difficultyMin && map.difficulty <= difficultyMax,
  )

  if (filteredMaps.length < count) {
    throw new Error(
      `Not enough KoG maps in category ${category} with difficulty ${difficultyMin}-${difficultyMax} stars. Need ${count}, got ${filteredMaps.length}`,
    )
  }

  const shuffled = shuffleArray([...filteredMaps])
  const selectedMaps = shuffled.slice(0, count)

  return selectedMaps.map((map, index) => ({
    mapName: map.name,
    position: index,
    difficulty: map.difficulty,
    points: map.points,
  }))
}

export function validateKoGGridOptions(options: GridGeneratorOptions): {
  valid: boolean
  error?: string
} {
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
