import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type') || 'bingo'
    const category = sp.get('category') || 'all'
    const sort = sp.get('sort') || 'wins'
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20')))

    const payload = await getPayload({ config })

    if (type === 'bingo') {
      return await getBingoLeaderboard(payload, { category, sort, page, limit })
    } else if (type === 'race') {
      return await getRaceLeaderboard(payload, { category, sort, page, limit })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('[API] Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

interface LeaderboardParams {
  category: string
  sort: string
  page: number
  limit: number
}

const BINGO_CATEGORIES = [
  'novice', 'moderate', 'brutal', 'insane', 'dummy', 'ddmax', 'oldschool', 'solo_maps', 'race',
] as const

async function getBingoLeaderboard(
  payload: Awaited<ReturnType<typeof getPayload>>,
  { category, sort, page, limit }: LeaderboardParams,
) {
  const { docs: users } = await payload.find({
    collection: 'users',
    limit: 500,
    depth: 1,
  })

  type Entry = {
    user: {
      id: string
      ingameNick: string
      isSystemVerified: boolean
      roles: string
      primaryRole: any
      lastSeenAt: string | null
      skin: { name?: string; color_body?: number; color_feet?: number } | null
    }
    stats: {
      gamesPlayed: number
      gamesWon: number
      winRate: number
      totalMapsCompleted: number
    }
  }

  const entries: Entry[] = []

  for (const u of users) {
    const bingo = u.bingo as any
    if (!bingo) continue

    let gamesPlayed = 0
    let gamesWon = 0
    let totalMapsCompleted = 0

    if (category === 'all') {
      gamesPlayed = bingo.totalGamesPlayed || 0
      gamesWon = bingo.totalGamesWon || 0
    } else if (BINGO_CATEGORIES.includes(category as any)) {
      const cat = bingo[category] as any
      if (cat) {
        for (const mode of ['solo', 'team'] as const) {
          const m = cat[mode]
          if (m) {
            gamesPlayed += m.gamesPlayed || 0
            gamesWon += m.gamesWon || 0
            totalMapsCompleted += m.totalMapsCompleted || 0
          }
        }
      }
    }

    if (gamesPlayed === 0) continue

    const winRate = category === 'all'
      ? (bingo.winRate || 0)
      : Math.round((gamesWon / gamesPlayed) * 100)

    if (category !== 'all') {
      // For specific categories, also sum maps from both modes
    } else {
      // For "all", sum maps across all categories
      for (const catName of BINGO_CATEGORIES) {
        const cat = bingo[catName] as any
        if (!cat) continue
        for (const mode of ['solo', 'team'] as const) {
          totalMapsCompleted += cat[mode]?.totalMapsCompleted || 0
        }
      }
    }

    entries.push({
      user: {
        id: u.id,
        ingameNick: u.ingameNick || '',
        isSystemVerified: u.isSystemVerified || false,
        roles: (u.roles as string) || 'player',
        primaryRole: (u as any).primaryRole || null,
        lastSeenAt: (u.lastSeenAt as string) || null,
        skin: u.ingameStats?.skin
          ? {
              name: u.ingameStats.skin.name ?? undefined,
              color_body: u.ingameStats.skin.color_body ?? undefined,
              color_feet: u.ingameStats.skin.color_feet ?? undefined,
            }
          : null,
      },
      stats: { gamesPlayed, gamesWon, winRate, totalMapsCompleted },
    })
  }

  // Sort
  entries.sort((a, b) => {
    switch (sort) {
      case 'winRate':
        return b.stats.winRate - a.stats.winRate || b.stats.gamesWon - a.stats.gamesWon
      case 'games':
        return b.stats.gamesPlayed - a.stats.gamesPlayed
      case 'maps':
        return b.stats.totalMapsCompleted - a.stats.totalMapsCompleted
      default: // 'wins'
        return b.stats.gamesWon - a.stats.gamesWon || b.stats.winRate - a.stats.winRate
    }
  })

  const totalDocs = entries.length
  const totalPages = Math.ceil(totalDocs / limit)
  const start = (page - 1) * limit
  const paged = entries.slice(start, start + limit)

  return NextResponse.json({
    docs: paged.map((e, i) => ({ rank: start + i + 1, ...e })),
    totalDocs,
    totalPages,
    page,
  })
}

async function getRaceLeaderboard(
  payload: Awaited<ReturnType<typeof getPayload>>,
  { category, sort, page, limit }: LeaderboardParams,
) {
  const where: any = { gameStatus: { equals: 'completed' } }
  if (category !== 'all') {
    where.category = { equals: category }
  }

  const { docs: races } = await payload.find({
    collection: 'races',
    where,
    limit: 500,
    depth: 0,
  })

  // Aggregate per player from teams
  const playerMap = new Map<string, { wins: number; games: number; stepsWon: number }>()

  for (const race of races) {
    const winnerIdx = race.winnerTeam

    for (let ti = 0; ti < race.teams.length; ti++) {
      const team = race.teams[ti]
      const isWinnerTeam = winnerIdx === ti

      for (const p of team.players ?? []) {
        const userId = typeof p.user === 'string' ? p.user : (p.user as any)?.id
        if (!userId) continue

        const existing = playerMap.get(userId) || { wins: 0, games: 0, stepsWon: 0 }
        existing.games++
        existing.stepsWon += team.score || 0
        if (isWinnerTeam) existing.wins++
        playerMap.set(userId, existing)
      }
    }
  }

  if (playerMap.size === 0) {
    return NextResponse.json({ docs: [], totalDocs: 0, totalPages: 0, page: 1 })
  }

  // Fetch user data for all participants
  const userIds = Array.from(playerMap.keys())
  const { docs: users } = await payload.find({
    collection: 'users',
    where: { id: { in: userIds } },
    limit: userIds.length,
    depth: 1,
  })

  const userLookup = new Map(users.map((u) => [u.id, u]))

  type RaceEntry = {
    user: {
      id: string
      ingameNick: string
      isSystemVerified: boolean
      roles: string
      primaryRole: any
      lastSeenAt: string | null
      skin: { name?: string; color_body?: number; color_feet?: number } | null
    }
    stats: {
      gamesPlayed: number
      gamesWon: number
      winRate: number
      stepsWon: number
    }
  }

  const entries: RaceEntry[] = []

  for (const [userId, agg] of playerMap) {
    const u = userLookup.get(userId)
    if (!u) continue

    entries.push({
      user: {
        id: u.id,
        ingameNick: u.ingameNick || '',
        isSystemVerified: u.isSystemVerified || false,
        roles: (u.roles as string) || 'player',
        primaryRole: (u as any).primaryRole || null,
        lastSeenAt: (u.lastSeenAt as string) || null,
        skin: u.ingameStats?.skin
          ? {
              name: u.ingameStats.skin.name ?? undefined,
              color_body: u.ingameStats.skin.color_body ?? undefined,
              color_feet: u.ingameStats.skin.color_feet ?? undefined,
            }
          : null,
      },
      stats: {
        gamesPlayed: agg.games,
        gamesWon: agg.wins,
        winRate: agg.games > 0 ? Math.round((agg.wins / agg.games) * 100) : 0,
        stepsWon: agg.stepsWon,
      },
    })
  }

  // Sort
  entries.sort((a, b) => {
    switch (sort) {
      case 'winRate':
        return b.stats.winRate - a.stats.winRate || b.stats.gamesWon - a.stats.gamesWon
      case 'games':
        return b.stats.gamesPlayed - a.stats.gamesPlayed
      case 'rounds':
        return b.stats.stepsWon - a.stats.stepsWon
      default: // 'wins'
        return b.stats.gamesWon - a.stats.gamesWon || b.stats.winRate - a.stats.winRate
    }
  })

  const totalDocs = entries.length
  const totalPages = Math.ceil(totalDocs / limit)
  const start = (page - 1) * limit
  const paged = entries.slice(start, start + limit)

  return NextResponse.json({
    docs: paged.map((e, i) => ({ rank: start + i + 1, ...e })),
    totalDocs,
    totalPages,
    page,
  })
}
