/**
 * DDNet API Helpers
 * Pure HTTP-based — no native dependencies (sqlite3, etc.)
 *
 * Data sources:
 *   - Master Server: https://master1.ddnet.org/ddnet/15/servers.json
 *   - Player stats:  https://ddnet.org/players/?json2=NAME
 *   - Skin info:     https://ddstats.tw/profile/json?player=NAME
 */

// ============================================================================
// Types
// ============================================================================

export interface PlayerOnlineStatus {
  name: string
  online: boolean
  afk?: boolean
  server?: {
    ip: string
    port: number
    name: string
    map: string
    passworded?: boolean
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

// ============================================================================
// Bounded cache with automatic cleanup
// ============================================================================

interface CacheEntry<T> {
  data: T
  expires: number
}

class BoundedCache<T> {
  private map = new Map<string, CacheEntry<T>>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private maxSize: number,
    cleanupIntervalMs: number,
  ) {
    this.cleanupTimer = setInterval(() => this.evictExpired(), cleanupIntervalMs)
    // Allow Node.js to exit even if timer is active
    if (this.cleanupTimer.unref) this.cleanupTimer.unref()
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (entry.expires < Date.now()) {
      this.map.delete(key)
      return undefined
    }
    return entry.data
  }

  set(key: string, data: T, ttlMs: number): void {
    // Evict oldest entries if at capacity
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) this.map.delete(firstKey)
    }
    this.map.set(key, { data, expires: Date.now() + ttlMs })
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.map) {
      if (entry.expires < now) this.map.delete(key)
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.map.clear()
  }
}

// ============================================================================
// Caches
// ============================================================================

// Master Server: single cached response, refreshed every 15s
const SERVERS_CACHE_TTL = 15_000
let serversCache: { data: MasterServerData; expires: number } | null = null
let serversFetchPromise: Promise<MasterServerData> | null = null

// Player data: up to 200 entries, 60s TTL, cleanup every 2 min
const playerDataCache = new BoundedCache<PlayerData>(200, 120_000)
const PLAYER_DATA_TTL = 60_000

// ============================================================================
// Master Server types & fetcher
// ============================================================================

interface MasterClient {
  name: string
  clan: string
  country: number
  score: number
  is_player: boolean
  skin?: {
    name: string
    color_body?: number
    color_feet?: number
  }
  afk?: boolean
  team?: number
}

interface MasterServerInfo {
  name: string
  game_type: string
  passworded: boolean
  max_clients: number
  max_players: number
  map: { name: string }
  clients?: MasterClient[]
}

interface MasterServerEntry {
  addresses: string[]
  info: MasterServerInfo
}

interface MasterServerData {
  servers: MasterServerEntry[]
}

async function fetchServers(): Promise<MasterServerData> {
  // Deduplicate concurrent requests
  if (serversFetchPromise) return serversFetchPromise

  // Return cache if fresh
  if (serversCache && serversCache.expires > Date.now()) {
    return serversCache.data
  }

  serversFetchPromise = (async () => {
    try {
      const res = await fetch('https://master1.ddnet.org/ddnet/15/servers.json', {
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Master Server HTTP ${res.status}`)
      const data: MasterServerData = await res.json()
      serversCache = { data, expires: Date.now() + SERVERS_CACHE_TTL }
      return data
    } finally {
      serversFetchPromise = null
    }
  })()

  return serversFetchPromise
}

// ============================================================================
// Player Online Status
// ============================================================================

/**
 * Find online status for multiple players.
 * Fetches the Master Server list once and searches locally.
 */
export async function findPlayersOnline(nicknames: string[]): Promise<PlayerOnlineStatus[]> {
  if (nicknames.length === 0) return []

  let servers: MasterServerEntry[]
  try {
    const data = await fetchServers()
    servers = data.servers
  } catch (err) {
    console.error('[DDNet] Failed to fetch Master Server:', err)
    return nicknames.map((name) => ({ name, online: false }))
  }

  // Build a lookup: lowercase nickname → result
  const lookup = new Map<string, PlayerOnlineStatus>()
  for (const name of nicknames) {
    lookup.set(name.toLowerCase(), { name, online: false })
  }

  for (const server of servers) {
    const clients = server.info.clients
    if (!clients) continue

    for (const client of clients) {
      const key = client.name.toLowerCase()
      const entry = lookup.get(key)
      if (!entry || entry.online) continue // already found or not in our list

      const address = server.addresses[0] || ''
      const addressMatch = address.match(/:\/\/([^:]+):(\d+)/)

      entry.online = true
      entry.name = client.name // preserve original casing from server
      entry.afk = client.afk ?? false
      entry.server = {
        ip: addressMatch?.[1] || '',
        port: parseInt(addressMatch?.[2] || '8303'),
        name: server.info.name,
        map: server.info.map?.name || '',
        passworded: server.info.passworded,
      }
      if (client.skin) {
        entry.skin = {
          name: client.skin.name || 'default',
          colorBody: client.skin.color_body || 0,
          colorFeet: client.skin.color_feet || 0,
        }
      }
    }
  }

  return nicknames.map((name) => lookup.get(name.toLowerCase())!)
}

/**
 * Find a single player online
 */
export async function findPlayerOnline(nickname: string): Promise<PlayerOnlineStatus> {
  const results = await findPlayersOnline([nickname])
  return results[0]
}

// ============================================================================
// Player Data (DDNet stats API)
// ============================================================================

/**
 * Get player data with caching
 */
export async function getPlayerData(name: string, bypassCache = false): Promise<PlayerData | null> {
  const cacheKey = name.toLowerCase()

  if (!bypassCache) {
    const cached = playerDataCache.get(cacheKey)
    if (cached) return cached
  }

  try {
    const res = await fetch(
      `https://ddnet.org/players/?json2=${encodeURIComponent(name)}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`DDNet API HTTP ${res.status}`)
    }

    const json = await res.json()

    // Empty response = player doesn't exist
    if (!json || !json.player) {
      console.log(`[DDNet] Player "${name}" not found on DDNet`)
      return null
    }

    const data: PlayerData = {
      name: json.player,
      url: `https://ddnet.org/players/${encodeURIComponent(json.player)}/`,
      points: json.points?.points || 0,
      rank: json.points?.rank || undefined,
      favoriteServer: json.favorite_server?.server || '',
      hoursPlayedPast365days: json.points_last_year?.points || 0,
      serverTypes: json.types
        ? Object.entries(json.types).map(([type, stats]: [string, any]) => ({
            type,
            points: stats?.points?.points || 0,
            rank: stats?.points?.rank || undefined,
          }))
        : [],
      recentFinishes: (json.last_finishes || []).map((f: any) => ({
        mapName: f.map || '',
        mapType: f.type || '',
        timestamp: (f.timestamp || 0) * 1000, // API returns seconds, convert to ms
        timeSeconds: f.time || 0,
      })),
    }

    playerDataCache.set(cacheKey, data, PLAYER_DATA_TTL)
    return data
  } catch (error) {
    console.error(`[DDNet] Failed to fetch player ${name}:`, error)
    return null
  }
}

// ============================================================================
// Skin Info
// ============================================================================

/**
 * Get player's skin info.
 * First tries DDStats profile API (works even when player is offline),
 * then falls back to Master Server (only when online).
 */
export async function getPlayerSkinInfo(
  nickname: string,
): Promise<{ name: string; colorBody: number; colorFeet: number } | null> {
  // Try DDStats profile API first (works offline)
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
