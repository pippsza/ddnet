interface MapInfo {
  mapName: string
  position: number
  difficulty: number
  points: number
}

interface GridGeneratorOptions {
  category: string
  subcategory?: string
  gridSize: '3x3' | '5x5' | '7x7'
  difficultyMin: number
  difficultyMax: number
}

const GRID_SIZES = {
  '3x3': 9,
  '5x5': 25,
  '7x7': 49,
}

// Map our internal category names to DDNet API type values
const CATEGORY_TO_DDNET_TYPE: Record<string, string> = {
  novice: 'Novice',
  moderate: 'Moderate',
  brutal: 'Brutal',
  insane: 'Insane',
  dummy: 'Dummy',
  ddmax: 'DDmaX',
  ddmax_easy: 'DDmaX.Easy',
  ddmax_next: 'DDmaX.Next',
  ddmax_pro: 'DDmaX.Pro',
  ddmax_nut: 'DDmaX.Nut',
  oldschool: 'Oldschool',
  solo_maps: 'Solo',
  race: 'Race',
}

// In-memory cache for DDNet maps (TTL 1 hour)
let mapsCache: { data: DDNetMapRaw[]; expires: number } | null = null
const MAPS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface DDNetMapRaw {
  name: string
  type: string
  points: number
  difficulty: number
  mapper?: string
}

interface DDNetMapData {
  name: string
  difficulty: number
  points: number
}

/**
 * Generate random maps for bingo grid
 * Uses DDNet API to fetch maps and filter by difficulty
 */
export async function generateBingoGrid(options: GridGeneratorOptions): Promise<MapInfo[]> {
  const { category, subcategory, gridSize, difficultyMin, difficultyMax } = options

  const count = GRID_SIZES[gridSize]

  // Fetch maps from DDNet API for category
  const allMaps = await fetchMapsByCategory(category, subcategory)

  // Filter by difficulty range (in stars)
  const filteredMaps = allMaps.filter(
    (map) => map.difficulty >= difficultyMin && map.difficulty <= difficultyMax,
  )

  if (filteredMaps.length < count) {
    throw new Error(
      `Not enough maps in category ${category}${subcategory ? `.${subcategory}` : ''} with difficulty ${difficultyMin}-${difficultyMax} stars. Need ${count}, got ${filteredMaps.length}`,
    )
  }

  // Shuffle and pick random maps
  const shuffled = shuffleArray([...filteredMaps])
  const selectedMaps = shuffled.slice(0, count)

  return selectedMaps.map((map, index) => ({
    mapName: map.name,
    position: index,
    difficulty: map.difficulty,
    points: map.points,
  }))
}

/**
 * Fetch all maps from DDNet API with caching
 */
async function fetchAllMaps(): Promise<DDNetMapRaw[]> {
  if (mapsCache && mapsCache.expires > Date.now()) {
    return mapsCache.data
  }

  const response = await fetch('https://ddnet.org/releases/maps.json', {
    headers: { 'User-Agent': 'DDNet-Bingo/1.0' },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch DDNet maps: ${response.statusText}`)
  }

  const maps: DDNetMapRaw[] = await response.json()

  mapsCache = { data: maps, expires: Date.now() + MAPS_CACHE_TTL }
  return maps
}

/**
 * Fetch maps by category from DDNet API
 */
async function fetchMapsByCategory(
  category: string,
  subcategory?: string,
): Promise<DDNetMapData[]> {
  const allMaps = await fetchAllMaps()

  // Determine the DDNet type to filter by
  const ddnetType = subcategory
    ? CATEGORY_TO_DDNET_TYPE[subcategory] || CATEGORY_TO_DDNET_TYPE[category]
    : CATEGORY_TO_DDNET_TYPE[category]

  if (!ddnetType) {
    throw new Error(`Unknown category: ${category}`)
  }

  return allMaps
    .filter((m) => m.type === ddnetType)
    .map((m) => ({
      name: m.name,
      difficulty: m.difficulty || 0,
      points: m.points || 0,
    }))
}

/**
 * Get all maps from DDNet API (public, for use in other services)
 */
export async function getAllDDNetMaps(): Promise<DDNetMapRaw[]> {
  return fetchAllMaps()
}

/**
 * Get maps by category (public, for use in other services)
 */
export async function getMapsByCategory(
  category: string,
  subcategory?: string,
): Promise<DDNetMapData[]> {
  return fetchMapsByCategory(category, subcategory)
}

/**
 * Clear maps cache (useful for forcing refresh)
 */
export function clearMapsCache(): void {
  mapsCache = null
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

/**
 * Validate grid generation options
 */
export function validateGridOptions(options: GridGeneratorOptions): {
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
