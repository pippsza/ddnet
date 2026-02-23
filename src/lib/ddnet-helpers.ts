/**
 * DDNet API Helpers
 * Wrapper functions around ddnet.js library for common operations
 *
 * Uses lazy imports to avoid loading sqlite3 native bindings at build time.
 */

// Lazy-loaded ddnet module (sqlite3 native dep breaks Next.js build if imported at top level)
let _ddnetModule: typeof import('ddnet') | null = null
async function getDdnet() {
  if (!_ddnetModule) {
    _ddnetModule = await import('ddnet')
  }
  return _ddnetModule
}

// ============================================================================
// Types
// ============================================================================

export interface PlayerOnlineStatus {
  name: string
  online: boolean
  server?: {
    ip: string
    port: number
    name: string
    map: string
  }
  skin?: {
    name: string
    colorBody: number
    colorFeet: number
  }
}

export interface PlayerData {
  name: string
  url: string
  points: number
  rank?: number
  favoriteServer: string
  hoursPlayedPast365days: number
  serverTypes: {
    type: string
    points: number
    rank?: number
  }[]
  recentFinishes: {
    mapName: string
    mapType: string
    timestamp: number
    timeSeconds: number
  }[]
}

export interface MapFinish {
  mapName: string
  timestamp: number
  timeSeconds: number
  country?: string
  rank?: number
}

// ============================================================================
// Cache
// ============================================================================

const playerDataCache = new Map<string, { data: PlayerData; expires: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

// ============================================================================
// Player Online Status Functions
// ============================================================================

/**
 * Find online status for multiple players
 * Uses DDNet Master Server API to check each player
 */
export async function findPlayersOnline(nicknames: string[]): Promise<PlayerOnlineStatus[]> {
  const results = await Promise.allSettled(
    nicknames.map(async (name) => {
      try {
        const { findPlayer } = await getDdnet()
        const found = await findPlayer(name, 'name')

        if (!found || found.length === 0) {
          return {
            name,
            online: false,
          }
        }

        // Take the first result (player could be on multiple servers with same nick)
        const player = found[0]
        const address = player.server.addresses[0]

        // Parse address (format: "tw-0.6+udp://ip:port" or similar)
        const addressMatch = address.match(/:\/\/([^:]+):(\d+)/)
        const ip = addressMatch?.[1] || ''
        const port = parseInt(addressMatch?.[2] || '8303')

        // Get map name from server info
        const serverInfo = player.server.self.info as any
        const mapName = serverInfo?.map?.name || ''

        return {
          name: player.name,
          online: true,
          server: {
            ip,
            port,
            name: player.server.name,
            map: mapName,
          },
          skin: player.self.skin
            ? {
                name: player.self.skin.name || 'default',
                colorBody: player.self.skin.color_body || 0,
                colorFeet: player.self.skin.color_feet || 0,
              }
            : undefined,
        }
      } catch {
        return {
          name,
          online: false,
        }
      }
    })
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      name: nicknames[index],
      online: false,
    }
  })
}

/**
 * Find a single player online
 */
export async function findPlayerOnline(nickname: string): Promise<PlayerOnlineStatus> {
  const results = await findPlayersOnline([nickname])
  return results[0]
}

/**
 * Get detailed info about online player including server info
 */
export async function getOnlinePlayerDetails(nickname: string) {
  try {
    const { findPlayer } = await getDdnet()
    const found = await findPlayer(nickname, 'name')
    if (!found || found.length === 0) {
      return null
    }
    return found[0]
  } catch {
    return null
  }
}

// ============================================================================
// Player Data Functions
// ============================================================================

/**
 * Get player data with caching
 */
export async function getPlayerData(name: string, bypassCache = false): Promise<PlayerData | null> {
  // Check cache
  if (!bypassCache) {
    const cached = playerDataCache.get(name.toLowerCase())
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
  }

  try {
    const { Player } = await getDdnet()
    const player = await Player.new(name, bypassCache)

    const data: PlayerData = {
      name: player.name,
      url: player.url,
      points: player.globalLeaderboard.completionist?.points || 0,
      rank: player.globalLeaderboard.completionist?.placement,
      favoriteServer: player.favoriteServer,
      hoursPlayedPast365days: player.hoursPlayedPast365days,
      serverTypes: Object.entries(player.serverTypes).map(([type, stats]) => ({
        type,
        points: (stats as any).leaderboard?.points || 0,
        rank: (stats as any).leaderboard?.placement,
      })),
      recentFinishes: player.finishes.recent.map((f: any) => ({
        mapName: f.mapName,
        mapType: f.mapType,
        timestamp: f.timestamp,
        timeSeconds: f.timeSeconds,
      })),
    }

    // Cache the result
    playerDataCache.set(name.toLowerCase(), {
      data,
      expires: Date.now() + CACHE_TTL,
    })

    return data
  } catch (error) {
    console.error(`[DDNet] Failed to fetch player ${name}:`, error)
    return null
  }
}

/**
 * Search for players by name
 */
export async function searchPlayers(
  query: string
): Promise<{ name: string; points: number }[] | null> {
  try {
    const { Player } = await getDdnet()
    const results = await Player.search(query)
    if (!results) return null

    return results.map((r) => ({
      name: r.name,
      points: r.points,
    }))
  } catch {
    return null
  }
}

// ============================================================================
// Map Finish Functions
// ============================================================================

/**
 * Check if player has finished a map after a specific timestamp
 * Useful for Bingo game to verify finishes during game
 */
export async function hasFinishedMapAfter(
  playerName: string,
  mapName: string,
  afterTimestamp: Date
): Promise<boolean> {
  try {
    const { Player } = await getDdnet()
    const player = await Player.new(playerName, true) // bypass cache for fresh data
    const afterTime = afterTimestamp.getTime()

    // Check recent finishes
    for (const finish of player.finishes.recent) {
      if (
        finish.mapName.toLowerCase() === mapName.toLowerCase() &&
        finish.timestamp > afterTime
      ) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Get all finished map names for a player
 */
export async function getPlayerFinishedMaps(playerName: string): Promise<string[]> {
  try {
    const { Player } = await getDdnet()
    const player = await Player.new(playerName)
    const finishedMaps = await player.getAllFinishedMapNames()
    return finishedMaps.map((m) => m.name)
  } catch {
    return []
  }
}

/**
 * Check multiple maps for a player and return which ones were finished after timestamp
 */
export async function checkMapsFinishedAfter(
  playerName: string,
  mapNames: string[],
  afterTimestamp: Date
): Promise<string[]> {
  try {
    const { Player } = await getDdnet()
    const player = await Player.new(playerName, true)
    const afterTime = afterTimestamp.getTime()

    const finishedMaps: string[] = []
    const mapNamesLower = new Set(mapNames.map((m) => m.toLowerCase()))

    for (const finish of player.finishes.recent) {
      if (
        mapNamesLower.has(finish.mapName.toLowerCase()) &&
        finish.timestamp > afterTime
      ) {
        finishedMaps.push(finish.mapName)
      }
    }

    return finishedMaps
  } catch {
    return []
  }
}

// ============================================================================
// Skin Functions
// ============================================================================

/**
 * Get player's skin info.
 * First tries DDStats profile API (works even when player is offline),
 * then falls back to Master Server (only when online, but has live colors).
 */
export async function getPlayerSkinInfo(
  nickname: string
): Promise<{ name: string; colorBody: number; colorFeet: number } | null> {
  // Try DDStats profile API first (works offline, has skin_name)
  try {
    const res = await fetch(
      `https://ddstats.tw/profile/json?player=${encodeURIComponent(nickname)}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const profile = await res.json()
      if (profile.skin_name) {
        return {
          name: profile.skin_name,
          colorBody: profile.skin_color_body || 0,
          colorFeet: profile.skin_color_feet || 0,
        }
      }
    }
  } catch {
    // DDStats unavailable, try Master Server
  }

  // Fallback: Master Server (only works when player is online)
  const onlineStatus = await findPlayerOnline(nickname)
  if (onlineStatus.online && onlineStatus.skin) {
    return onlineStatus.skin
  }

  return null
}

/**
 * Render player skin to buffer (requires player to be online)
 */
export async function renderPlayerSkin(nickname: string): Promise<Buffer | null> {
  try {
    const playerDetails = await getOnlinePlayerDetails(nickname)
    if (!playerDetails) return null

    return await playerDetails.renderSkin()
  } catch {
    return null
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear the player data cache
 */
export function clearPlayerCache(): void {
  playerDataCache.clear()
}

/**
 * Set the DDNet library cache TTL
 */
export async function setDDNetCacheTTL(ttlMs: number): Promise<void> {
  const { Player } = await getDdnet()
  Player.setTTL(ttlMs)
}
