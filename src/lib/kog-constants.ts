/**
 * KoG (King of Gores) Constants
 * Map categories, game modes, and configuration for KoG game modes
 * Based on: https://kog.tw/
 */

export const KOG_CATEGORIES = [
  { label: 'Easy', value: 'kog_easy', icon: 'Sprout' },
  { label: 'Main', value: 'kog_main', icon: 'Mountain' },
  { label: 'Hard', value: 'kog_hard', icon: 'Flame' },
  { label: 'Insane', value: 'kog_insane', icon: 'Skull' },
  { label: 'Extreme', value: 'kog_extreme', icon: 'Sword' },
  { label: 'Solo', value: 'kog_solo', icon: 'User' },
  { label: 'Mod', value: 'kog_mod', icon: 'Puzzle' },
]

export type KoGCategory =
  | 'kog_easy'
  | 'kog_main'
  | 'kog_hard'
  | 'kog_insane'
  | 'kog_extreme'
  | 'kog_solo'
  | 'kog_mod'

// Maps our internal values to KoG HTML page category labels
export const KOG_CATEGORY_TO_LABEL: Record<KoGCategory, string> = {
  kog_easy: 'Easy',
  kog_main: 'Main',
  kog_hard: 'Hard',
  kog_insane: 'Insane',
  kog_extreme: 'Extreme',
  kog_solo: 'Unknown', // KoG maps page labels Solo maps as "Unknown"
  kog_mod: 'Mod',
}

export const KOG_CATEGORY_VALUES = KOG_CATEGORIES.map((c) => c.value)

export function isKoGCategory(value: string): boolean {
  return KOG_CATEGORY_VALUES.includes(value)
}

export const getKoGCategoryLabel = (value: KoGCategory): string => {
  return KOG_CATEGORIES.find((c) => c.value === value)?.label || value
}
