/**
 * KoG Map Provider
 * Fetches all KoG maps from kog.tw/get.php?p=maps, parses HTML with Cheerio,
 * and provides maps filtered by category and difficulty.
 *
 * KoG maps page returns ~2MB HTML with all maps, stars, categories, points, and mappers.
 * Cached in memory for 1 hour.
 */

import * as cheerio from 'cheerio'
import { KOG_CATEGORY_TO_LABEL, type KoGCategory } from '@/lib/kog-constants'

const KOG_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface KoGMapRaw {
  name: string
  category: string // Raw category label from HTML (Easy, Main, Hard, etc.)
  stars: number
  points: number
  mapper: string
}

export interface KoGMapData {
  name: string
  difficulty: number // stars (1-5)
  points: number
}

// In-memory cache (TTL 1 hour)
let mapsCache: { data: KoGMapRaw[]; expires: number } | null = null
const MAPS_CACHE_TTL = 60 * 60 * 1000

/**
 * Get a PHP session from kog.tw (required before any get.php request)
 */
async function getSession(): Promise<string | null> {
  try {
    const res = await fetch('https://kog.tw/', {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': KOG_USER_AGENT },
    })

    const setCookie = res.headers.getSetCookie?.() ?? []
    for (const cookie of setCookie) {
      const match = cookie.match(/PHPSESSID=([^;]+)/)
      if (match) return match[1]
    }

    const rawCookie = res.headers.get('set-cookie') || ''
    const match = rawCookie.match(/PHPSESSID=([^;]+)/)
    return match ? match[1] : null
  } catch (err) {
    console.error('[KoG Maps] Failed to get session:', err)
    return null
  }
}

/**
 * Fetch all KoG maps from the maps page and parse with Cheerio
 */
async function fetchAllMaps(): Promise<KoGMapRaw[]> {
  if (mapsCache && mapsCache.expires > Date.now()) {
    return mapsCache.data
  }

  const session = await getSession()
  if (!session) {
    throw new Error('Failed to obtain KoG PHP session')
  }

  const res = await fetch('https://kog.tw/get.php?p=maps', {
    headers: {
      Cookie: `PHPSESSID=${session}`,
      'User-Agent': KOG_USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    throw new Error(`KoG maps page returned HTTP ${res.status}`)
  }

  const html = await res.text()
  if (!html || html.length < 1000) {
    throw new Error(`KoG maps page returned suspiciously short response (${html.length} chars)`)
  }

  const $ = cheerio.load(html)
  const maps: KoGMapRaw[] = []

  $('.card.mb-4').each((_, card) => {
    const name = $(card).find('h4').text().trim()
    const items = $(card).find('li.list-group-item')

    const stars = $(card).find('i.bi-star-fill').length
    const category = items.eq(1).text().trim()
    const pointsText = items.eq(2).text().trim()
    const points = parseInt(pointsText) || 0
    const mapper = items.eq(3).text().trim()

    if (name) {
      maps.push({ name, category, stars, points, mapper })
    }
  })

  if (maps.length === 0) {
    throw new Error('No maps parsed from KoG maps page')
  }

  console.log(`[KoG Maps] Fetched and parsed ${maps.length} maps`)
  mapsCache = { data: maps, expires: Date.now() + MAPS_CACHE_TTL }
  return maps
}

/**
 * Get KoG maps filtered by internal category value
 */
export async function getKoGMapsByCategory(category: KoGCategory): Promise<KoGMapData[]> {
  const allMaps = await fetchAllMaps()

  const htmlLabel = KOG_CATEGORY_TO_LABEL[category]
  if (!htmlLabel) {
    throw new Error(`Unknown KoG category: ${category}`)
  }

  return allMaps
    .filter((m) => m.category === htmlLabel)
    .map((m) => ({
      name: m.name,
      difficulty: m.stars || 1,
      points: m.points || 0,
    }))
}

/**
 * Get all KoG maps (public, for use in other services)
 */
export async function getAllKoGMaps(): Promise<KoGMapRaw[]> {
  return fetchAllMaps()
}

/**
 * Clear maps cache (useful for forcing refresh)
 */
export function clearKoGMapsCache(): void {
  mapsCache = null
}
