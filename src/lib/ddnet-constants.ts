/**
 * DDNet Constants
 * Official DDNet map categories, game modes, and configuration
 * Based on: https://ddnet.org/
 */

export const DDNET_CATEGORIES = [
  { label: 'Novice', value: 'novice' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Brutal', value: 'brutal' },
  { label: 'Insane', value: 'insane' },
  { label: 'Dummy', value: 'dummy' },
  { label: 'DDmaX', value: 'ddmax' },
  { label: 'Oldschool', value: 'oldschool' },
  { label: 'Solo', value: 'solo_maps' },
  { label: 'Race', value: 'race' },
]

export const DDNET_SUBCATEGORIES = [
  { label: 'DDmaX.Easy', value: 'ddmax_easy', parent: 'ddmax' },
  { label: 'DDmaX.Next', value: 'ddmax_next', parent: 'ddmax' },
  { label: 'DDmaX.Pro', value: 'ddmax_pro', parent: 'ddmax' },
  { label: 'DDmaX.Nut', value: 'ddmax_nut', parent: 'ddmax' },
]

export const BINGO_MODES = [
  { label: 'Solo Mode (1 team, no opponents, separate points)', value: 'solo' },
  { label: 'Team Mode (2 teams compete, 1-2 players per team)', value: 'team' },
]

export const BINGO_WIN_CONDITIONS = [
  { label: 'Line or Diagonal', value: 'line' },
  { label: 'Cross', value: 'cross' },
  { label: 'Full House', value: 'full_house' },
]

export const BINGO_GRID_SIZES = [
  { label: '3x3', value: '3x3' },
  { label: '5x5', value: '5x5' },
  { label: '7x7', value: '7x7' },
]

export const BINGO_TEAM_COLORS = [
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' },
]

export const GAME_STATUSES = [
  { label: 'Waiting for Players', value: 'waiting' },
  { label: 'Ready to Start', value: 'ready' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export const TEAM_STATUSES = [
  { label: 'Not Ready', value: 'not_ready' },
  { label: 'Ready', value: 'ready' },
  { label: 'Playing', value: 'playing' },
  { label: 'Winner', value: 'winner' },
  { label: 'Loser', value: 'loser' },
]

// Type helpers
export type CategoryValue = DDNetCategory | `custom_${string}`

export type DDNetCategory =
  | 'novice'
  | 'moderate'
  | 'brutal'
  | 'insane'
  | 'dummy'
  | 'ddmax'
  | 'oldschool'
  | 'solo_maps'
  | 'race'

export type DDNetSubcategory = 'ddmax_easy' | 'ddmax_next' | 'ddmax_pro' | 'ddmax_nut'

export type BingoMode = 'solo' | 'team'

export type BingoWinCondition = 'line' | 'cross' | 'full_house'

export type BingoGridSize = '3x3' | '5x5' | '7x7'

export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'

export type GameStatus = 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'

export type TeamStatus = 'not_ready' | 'ready' | 'playing' | 'winner' | 'loser'

// Helper functions
export const getCategoryLabel = (value: DDNetCategory): string => {
  return DDNET_CATEGORIES.find((c) => c.value === value)?.label || value
}

export const getSubcategoryLabel = (value: DDNetSubcategory): string => {
  return DDNET_SUBCATEGORIES.find((c) => c.value === value)?.label || value
}

export const hasSubcategories = (category: DDNetCategory): boolean => {
  return category === 'ddmax' || category === 'oldschool'
}

export const getSubcategoriesForCategory = (category: DDNetCategory) => {
  return DDNET_SUBCATEGORIES.filter((sub) => sub.parent === category)
}

/**
 * Get label for any category (standard or custom).
 * For custom categories, returns the name from the provided list, or the raw slug.
 */
export const getCategoryLabelUniversal = (
  value: string,
  customCategories?: Array<{ name: string; slug: string }>,
): string => {
  const standard = DDNET_CATEGORIES.find((c) => c.value === value)
  if (standard) return standard.label

  if (customCategories) {
    const custom = customCategories.find((c) => c.slug === value)
    if (custom) return custom.name
  }

  return value
}

// Points calculation (from DDNet)
export const CATEGORY_MULTIPLIERS = {
  novice: { multiplier: 1, offset: 0 },
  moderate: { multiplier: 2, offset: 5 },
  brutal: { multiplier: 3, offset: 15 },
  insane: { multiplier: 4, offset: 30 },
  dummy: { multiplier: 5, offset: 5 },
  ddmax: { multiplier: 4, offset: 0 },
  oldschool: { multiplier: 6, offset: 0 },
  solo_maps: { multiplier: 4, offset: 0 },
  race: { multiplier: 2, offset: 0 },
} as const

export const calculateMapPoints = (stars: number, category: DDNetCategory): number => {
  const { multiplier, offset } = CATEGORY_MULTIPLIERS[category]
  return stars * multiplier + offset
}
