/**
 * KoG Finish Detector
 *
 * Detects player finishes on KoG maps by comparing snapshots of their
 * finished maps list from kog.tw player profiles.
 *
 * Unlike DDNet (which has a JSON API with timestamps), KoG requires:
 *   1. Fetching player's HTML profile from kog.tw
 *   2. Parsing finished maps list
 *   3. Comparing with a previous snapshot to find NEW finishes
 *
 * Limitations:
 *   - No precise timestamps (only lastFinishDate with day precision)
 *   - Higher latency than DDNet API (~1-2s per player due to HTML parsing + session)
 *   - Rate limited by PHP session management (one session per request)
 */

import { fetchKoGPlayerData } from '@/lib/kog-helpers'

export interface KoGFinish {
  mapName: string
  finishCount: number
  lastFinishDate: string
  bestTime: string
}

// Snapshot cache: playerName(lowercase) → Set of finished map names
const finishSnapshots = new Map<string, Set<string>>()

/**
 * Take a snapshot of a player's finished maps.
 * Call this when a game starts to establish a baseline.
 */
export async function takeFinishSnapshot(playerName: string): Promise<Set<string>> {
  const data = await fetchKoGPlayerData(playerName)
  const mapNames = new Set(data?.finishedMaps.map((m) => m.name.toLowerCase()) ?? [])

  finishSnapshots.set(playerName.toLowerCase(), mapNames)
  return mapNames
}

/**
 * Detect new finishes since the last snapshot.
 * Returns maps that appear in the player's current finished list but not in the snapshot.
 */
export async function detectNewFinishes(
  playerName: string,
  targetMaps?: string[],
): Promise<KoGFinish[]> {
  const key = playerName.toLowerCase()
  const snapshot = finishSnapshots.get(key)

  if (!snapshot) {
    console.warn(`[KoG Finish] No snapshot found for "${playerName}". Taking one now.`)
    await takeFinishSnapshot(playerName)
    return []
  }

  const data = await fetchKoGPlayerData(playerName)
  if (!data) return []

  const newFinishes: KoGFinish[] = []

  for (const map of data.finishedMaps) {
    const mapLower = map.name.toLowerCase()

    // Skip maps that were already finished before the game started
    if (snapshot.has(mapLower)) continue

    // If target maps specified, only count finishes on those maps
    if (targetMaps && !targetMaps.some((t) => t.toLowerCase() === mapLower)) continue

    newFinishes.push({
      mapName: map.name,
      finishCount: map.finishes,
      lastFinishDate: map.lastFinishDate,
      bestTime: map.bestTime,
    })
  }

  return newFinishes
}

/**
 * Update the snapshot with newly detected finishes (mark them as "known").
 * Call this after processing finishes to avoid counting them again.
 */
export function updateSnapshot(playerName: string, finishedMapNames: string[]): void {
  const key = playerName.toLowerCase()
  const snapshot = finishSnapshots.get(key)
  if (!snapshot) return

  for (const name of finishedMapNames) {
    snapshot.add(name.toLowerCase())
  }
}

/**
 * Remove snapshot for a player (call when game ends)
 */
export function clearSnapshot(playerName: string): void {
  finishSnapshots.delete(playerName.toLowerCase())
}

/**
 * Clear all snapshots
 */
export function clearAllSnapshots(): void {
  finishSnapshots.clear()
}
