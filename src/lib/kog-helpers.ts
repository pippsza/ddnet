/**
 * KoG (King of Gores) Player Data Parser
 *
 * KoG has no JSON API — player data is fetched as HTML from get.php
 * and parsed server-side with Cheerio.
 *
 * Session flow:
 *   1. GET https://kog.tw/ → receive PHPSESSID cookie
 *   2. GET https://kog.tw/get.php?p=players&player=NAME (with cookie) → HTML fragment
 *   Session is single-use per get.php call, but get.php returns a new PHPSESSID.
 */

import * as cheerio from 'cheerio'

const KOG_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

import type {
  KoGPlayerData,
  KoGSkin,
  KoGTeammate,
  KoGCategoryProgress,
  KoGFinishedMap,
} from './kog-types'

// ============================================================================
// Bounded cache (same pattern as ddnet-helpers.ts)
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
}

// 100 entries, 5-minute TTL, cleanup every 2 minutes
const kogCache = new BoundedCache<KoGPlayerData>(100, 120_000)
const KOG_CACHE_TTL = 300_000 // 5 minutes

// ============================================================================
// Session management
// ============================================================================

async function getKoGSession(): Promise<string | null> {
  try {
    console.log('[KoG] Fetching session from kog.tw...')
    const res = await fetch('https://kog.tw/', {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': KOG_USER_AGENT },
    })
    console.log('[KoG] Session response status:', res.status)

    const setCookie = res.headers.getSetCookie?.() ?? []
    console.log('[KoG] getSetCookie() returned', setCookie.length, 'cookies:', setCookie.map(c => c.substring(0, 50)))
    for (const cookie of setCookie) {
      const match = cookie.match(/PHPSESSID=([^;]+)/)
      if (match) {
        console.log('[KoG] Got session via getSetCookie:', match[1].substring(0, 10) + '...')
        return match[1]
      }
    }

    // Fallback: try raw header
    const rawCookie = res.headers.get('set-cookie') || ''
    console.log('[KoG] Raw set-cookie header:', rawCookie.substring(0, 80))
    const match = rawCookie.match(/PHPSESSID=([^;]+)/)
    if (match) {
      console.log('[KoG] Got session via raw header:', match[1].substring(0, 10) + '...')
      return match[1]
    }

    console.error('[KoG] No PHPSESSID found in response headers')
    console.log('[KoG] All response headers:', Object.fromEntries(res.headers.entries()))
    return null
  } catch (err) {
    console.error('[KoG] Failed to get session:', err)
    return null
  }
}

// ============================================================================
// HTML Parser
// ============================================================================

function parseKoGHtml(html: string, playerName: string): KoGPlayerData | null {
  if (!html || html.length < 100) return null

  const $ = cheerio.load(html)

  const result: KoGPlayerData = {
    name: playerName,
    rank: null,
    totalPoints: 0,
    fixedPoints: 0,
    seasonPoints: 0,
    skin: null,
    wastedTimeSeconds: 0,
    teammates: [],
    categoryProgress: [],
    finishedMaps: [],
    unfinishedMaps: [],
  }

  // -- Name from page (use actual rendered name if available) --
  try {
    const h2 = $('h2').first().text().trim()
    if (h2) result.name = h2
  } catch {}

  // -- Rank & Points --
  try {
    $('li.list-group-item').each((_, el) => {
      const text = $(el).text()

      const rankMatch = text.match(/Rank\s*(\d+)\.\s*with\s*([\d,]+)\s*points/)
      if (rankMatch) {
        result.rank = parseInt(rankMatch[1])
        result.totalPoints = parseInt(rankMatch[2].replace(/,/g, ''))
      }

      const fixedMatch = text.match(/Fixed points:\s*(\d+)/)
      if (fixedMatch) {
        result.fixedPoints = parseInt(fixedMatch[1])
      }

      const seasonMatch = text.match(/Season points:\s*(\d+)/)
      if (seasonMatch) {
        result.seasonPoints = parseInt(seasonMatch[1])
      }
    })
  } catch {}

  // -- Skin --
  try {
    const skinSrc = $('#playerSkin').attr('src') || ''
    const skinMatch = skinSrc.match(/skin=([^&]+)&body_color=(\d+)&feet_color=(\d+)/)
    if (skinMatch) {
      result.skin = {
        name: decodeURIComponent(skinMatch[1]),
        colorBody: parseInt(skinMatch[2]),
        colorFeet: parseInt(skinMatch[3]),
      }
    }
  } catch {}

  // -- Wasted Time --
  try {
    const wastedHeader = $('h5:contains("Wasted time"), h5:contains("wasted time")')
    if (wastedHeader.length) {
      const timeText = wastedHeader.next('h6').text().trim()
      if (timeText) {
        let totalSeconds = 0
        const months = timeText.match(/(\d+)\s*months?/)
        const days = timeText.match(/(\d+)\s*days?/)
        const hours = timeText.match(/(\d+)\s*hours?/)
        const minutes = timeText.match(/(\d+)\s*minutes?/)
        const seconds = timeText.match(/(\d+)\s*seconds?/)
        if (months) totalSeconds += parseInt(months[1]) * 30 * 24 * 3600
        if (days) totalSeconds += parseInt(days[1]) * 24 * 3600
        if (hours) totalSeconds += parseInt(hours[1]) * 3600
        if (minutes) totalSeconds += parseInt(minutes[1]) * 60
        if (seconds) totalSeconds += parseInt(seconds[1])
        result.wastedTimeSeconds = totalSeconds
      }
    }
  } catch {}

  // -- Teammates --
  try {
    const teammatePattern = $('th:contains("best teammates")')
      .closest('table')
      .find('td')

    teammatePattern.each((_, el) => {
      const td = $(el)
      const countText = td.find('b').first().text().trim()
      const name = td.find('a').first().text().trim()
      if (countText && name) {
        result.teammates.push({
          name,
          mapsCount: parseInt(countText) || 0,
        })
      }
    })
  } catch {}

  // -- Category Progress --
  try {
    const categories = ['Solo', 'Easy', 'Main', 'Hard', 'Insane', 'Extreme', 'Mod']
    const mapTable = $('#nav-maps table').first()
    const cells = mapTable.find('tbody td')

    cells.each((i, el) => {
      if (i >= categories.length) return
      const text = $(el).text().trim()
      const match = text.match(/(\d+)\s*\/\s*(\d+)/)
      if (match) {
        result.categoryProgress.push({
          category: categories[i],
          mapsFinished: parseInt(match[1]),
          mapsTotal: parseInt(match[2]),
        })
      }
    })
  } catch {}

  // -- Finished Maps --
  try {
    $('#pills-finished tbody tr').each((_, row) => {
      const cols = $(row).find('th, td')
      const name = cols.eq(0).text().trim()
      const time = cols.eq(1).text().trim()
      const finishes = parseInt(cols.eq(2).text().trim()) || 0
      const lastFinish = cols.eq(3).text().trim()

      if (name) {
        result.finishedMaps.push({
          name,
          bestTime: time,
          finishes,
          lastFinishDate: lastFinish,
        })
      }
    })
  } catch {}

  // -- Unfinished Maps --
  try {
    $('#pills-unfinished tbody tr').each((_, row) => {
      const name = $(row).find('a').first().text().trim()
      if (name) result.unfinishedMaps.push(name)
    })
  } catch {}

  // Validate we actually got some data
  if (result.totalPoints === 0 && result.rank === null && result.finishedMaps.length === 0) {
    return null
  }

  return result
}

// ============================================================================
// Public API
// ============================================================================

export async function fetchKoGPlayerData(playerName: string): Promise<KoGPlayerData | null> {
  const cacheKey = playerName.toLowerCase()
  console.log(`[KoG] fetchKoGPlayerData("${playerName}")`)

  const cached = kogCache.get(cacheKey)
  if (cached) {
    console.log(`[KoG] Cache hit for "${playerName}"`)
    return cached
  }
  console.log(`[KoG] Cache miss for "${playerName}", fetching from kog.tw...`)

  const session = await getKoGSession()
  if (!session) {
    console.error('[KoG] Failed to obtain PHP session')
    return null
  }

  try {
    const url = `https://kog.tw/get.php?p=players&player=${encodeURIComponent(playerName)}`
    console.log(`[KoG] Fetching: ${url}`)
    console.log(`[KoG] Using session: ${session.substring(0, 10)}...`)

    const res = await fetch(url, {
      headers: {
        Cookie: `PHPSESSID=${session}`,
        'User-Agent': KOG_USER_AGENT,
      },
      signal: AbortSignal.timeout(15_000),
    })

    console.log(`[KoG] get.php response: status=${res.status}`)

    if (!res.ok) {
      console.error(`[KoG] HTTP ${res.status} for player ${playerName}`)
      return null
    }

    const html = await res.text()
    console.log(`[KoG] Response body length: ${html.length} chars`)

    if (!html || html.length === 0) {
      console.warn(`[KoG] Empty response for player ${playerName}`)
      return null
    }

    if (html.length < 500) {
      console.warn(`[KoG] Suspiciously short response for "${playerName}": ${html.substring(0, 200)}`)
    }

    const data = parseKoGHtml(html, playerName)
    console.log(`[KoG] Parse result for "${playerName}":`, data ? {
      rank: data.rank,
      points: data.totalPoints,
      finishedMaps: data.finishedMaps.length,
      categories: data.categoryProgress.length,
    } : 'null (no data parsed)')

    if (data) {
      kogCache.set(cacheKey, data, KOG_CACHE_TTL)
    }

    return data
  } catch (err) {
    console.error(`[KoG] Failed to fetch player ${playerName}:`, err)
    return null
  }
}
