import { Map as DDNetMap } from 'ddnet'

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

interface DDNetMapData {
  name: string
  difficulty: number
  points: number
}

/**
 * Fetch maps by category from DDNet
 * Note: ddnet package doesn't have direct category listing, so we use DDNet API
 */
async function fetchMapsByCategory(
  category: string,
  subcategory?: string,
): Promise<DDNetMapData[]> {
  try {
    // DDNet releases endpoint returns all maps
    // We need to fetch and filter by category
    const endpoint = `https://ddnet.org/releases/`
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'DDNet-Bingo-Bot/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch maps: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse HTML to extract maps (simplified - in production use proper parser)
    // The DDNet releases page has a structured format we can parse
    // For now, we'll use a simplified approach

    // Alternative: Use ddnet package Map class to get map data
    // But Map.new() requires specific map name, so we need to know names first

    // TODO: Implement proper parsing or create a cached map database
    // For now, return sample data for testing

    console.warn(
      `fetchMapsByCategory: Using sample data for ${category}. Implement proper DDNet API integration.`,
    )

    return generateSampleMaps(category, subcategory)
  } catch (error) {
    console.error('Error fetching maps from DDNet:', error)
    throw new Error(`Failed to fetch maps: ${error}`)
  }
}

/**
 * Generate sample maps for testing (replace with real DDNet API integration)
 */
function generateSampleMaps(category: string, subcategory?: string): DDNetMapData[] {
  const sampleMaps: Record<string, DDNetMapData[]> = {
    novice: [
      { name: 'Sunny Side Up', difficulty: 1, points: 1 },
      { name: 'Tangerine', difficulty: 1, points: 1 },
      { name: 'Tsunami', difficulty: 1, points: 1 },
      { name: 'Tutorial', difficulty: 1, points: 1 },
      { name: 'Camouflage', difficulty: 1, points: 1 },
      { name: 'Goo!', difficulty: 1, points: 1 },
      { name: 'Kobra', difficulty: 2, points: 2 },
      { name: 'Kobra 2', difficulty: 2, points: 2 },
      { name: 'Kobra 3', difficulty: 2, points: 2 },
      { name: 'Kobra 4', difficulty: 3, points: 3 },
      // Add more sample maps as needed
    ],
    moderate: [
      { name: 'Aequilibrium', difficulty: 2, points: 7 },
      { name: 'Baerchen', difficulty: 3, points: 9 },
      { name: 'Castle', difficulty: 3, points: 9 },
      { name: 'Cup of Tee', difficulty: 2, points: 7 },
      { name: 'Dizzy', difficulty: 3, points: 9 },
      // Add more
    ],
    brutal: [
      { name: 'Aim 10.0', difficulty: 4, points: 27 },
      { name: 'Aughlia', difficulty: 4, points: 27 },
      { name: 'Death Valley', difficulty: 5, points: 33 },
      // Add more
    ],
  }

  return sampleMaps[category] || []
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
