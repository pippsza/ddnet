import { isCustomCategory } from '@/lib/category-helpers'
import { getMapsByCategory } from '@/services/bingo/gridGenerator'

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

/**
 * Generate random maps for a race path (linear positions 0..N-1).
 * Reuses bingo's map-fetching logic.
 */
export async function generateRacePath(options: PathGeneratorOptions): Promise<MapInfo[]> {
  const { category, pathLength, difficultyMin, difficultyMax } = options

  const allMaps = isCustomCategory(category)
    ? await fetchCustomCategoryMaps(category)
    : await getMapsByCategory(category)

  const filteredMaps = allMaps.filter(
    (map) => map.difficulty >= difficultyMin && map.difficulty <= difficultyMax,
  )

  if (filteredMaps.length < pathLength) {
    throw new Error(
      `Not enough maps in category ${category} with difficulty ${difficultyMin}-${difficultyMax} stars. Need ${pathLength}, got ${filteredMaps.length}`,
    )
  }

  const shuffled = shuffleArray([...filteredMaps])
  const selected = shuffled.slice(0, pathLength)

  return selected.map((map, index) => ({
    mapName: map.name,
    position: index,
  }))
}

async function fetchCustomCategoryMaps(
  categorySlug: string,
): Promise<{ name: string; difficulty: number; points: number }[]> {
  const { getPayload } = await import('payload')
  const payloadConfig = (await import('@/payload.config')).default
  const payload = await getPayload({ config: payloadConfig })

  const customCats = await payload.findGlobal({ slug: 'custom-categories' })
  const category = (customCats as any)?.categories?.find((c: any) => c.slug === categorySlug)

  if (!category) {
    throw new Error(`Custom category "${categorySlug}" not found`)
  }

  return category.maps.map((m: any) => ({
    name: m.mapName,
    difficulty: m.difficulty || 0,
    points: m.points || 0,
  }))
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function validatePathOptions(options: PathGeneratorOptions): {
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
