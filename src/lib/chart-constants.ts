export const CHART_COLORS = [
  'hsl(var(--primary))',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  Novice: '#10b981',
  Moderate: '#3b82f6',
  Brutal: '#f59e0b',
  Insane: '#ef4444',
  Dummy: '#8b5cf6',
  'DDmaX.Easy': '#ec4899',
  'DDmaX.Next': '#f97316',
  'DDmaX.Pro': '#be185d',
  'DDmaX.Nut': '#a855f7',
  Oldschool: '#06b6d4',
  Solo: '#84cc16',
  Race: '#f97316',
  Fun: '#fbbf24',
  Event: '#14b8a6',
  // Gametypes
  DDNet: '#38bdf8',
  TestDDNet: '#7dd3fc',
  'DDNet++': '#0ea5e9',
  Vanilla: '#a3e635',
  zCatch: '#f472b6',
  iFreeze: '#22d3ee',
  iCTF: '#fb923c',
  TeeWare: '#c084fc',
  Infection: '#f87171',
  City: '#fbbf24',
  BlockWorlds: '#34d399',
  FNG: '#e879f9',
}

export function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || CHART_COLORS[index % CHART_COLORS.length]
}
