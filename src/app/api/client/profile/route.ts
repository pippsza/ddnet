import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User, Bingo, Race } from '@/payload-types'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'

/**
 * GET /api/client/profile?nick=PlayerName
 *
 * Aggregator endpoint for the DDNet game client.
 * Returns all data needed to render bingo/race modes:
 * - Player stats (bingo + race)
 * - Active game state (if any) with full game data
 * - Completed games history
 *
 * No authentication required — data is public, keyed by ingameNick.
 */
export async function GET(req: NextRequest) {
  try {
    const nick = req.nextUrl.searchParams.get('nick')
    if (!nick) {
      return NextResponse.json({ error: 'Missing ?nick= parameter' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Find user by ingameNick (case-insensitive)
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { ingameNick: { equals: nick } },
      limit: 1,
      depth: 0,
    })

    if (users.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const user = users[0] as User

    // Load active game if any
    let activeGame: any = null
    if (user.activeGame) {
      const ref = user.activeGame as { relationTo: string; value: string }
      if (ref.relationTo && ref.value) {
        try {
          const collection = ref.relationTo as 'bingo' | 'races'
          const game = await payload.findByID({
            collection,
            id: typeof ref.value === 'string' ? ref.value : (ref.value as any).id,
            depth: 1,
          })

          if (game) {
            activeGame = formatGameForClient(game, collection, user, nick)
          }
        } catch {
          // Game may have been deleted
        }
      }
    }

    // Load recent completed games (last 20, in parallel)
    const recentGames: any[] = []
    if (user.completedGames?.length) {
      const recentRefs = (
        user.completedGames as Array<{ relationTo: string; value: string }>
      )
        .slice(-20)
        .reverse()

      const results = await Promise.allSettled(
        recentRefs.map(async (ref) => {
          const collection = ref.relationTo as 'bingo' | 'races'
          const game = await payload.findByID({
            collection,
            id: typeof ref.value === 'string' ? ref.value : (ref.value as any).id,
            depth: 1,
          })
          return game ? formatGameForClient(game, collection, user, nick) : null
        }),
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          recentGames.push(result.value)
        }
      }
    }

    // Build response
    const response = {
      player: {
        id: user.id,
        ingameNick: user.ingameNick,
      },

      stats: {
        bingo: formatBingoStats(user),
        race: formatRaceStats(user),
      },

      activeGame,
      recentGames,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[API] Client profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    )
  }
}

// =============================================================================
// Helpers
// =============================================================================

function formatBingoStats(user: User) {
  const b = user.bingo
  if (!b) return null

  return {
    totalGamesPlayed: b.totalGamesPlayed ?? 0,
    totalGamesWon: b.totalGamesWon ?? 0,
    winRate: b.totalGamesPlayed
      ? Math.round(((b.totalGamesWon ?? 0) / b.totalGamesPlayed) * 100)
      : 0,
    favoriteCategory: b.favoriteCategory ?? null,
  }
}

function formatRaceStats(user: User) {
  const r = user.raceStats
  if (!r) return null

  return {
    totalRacesPlayed: r.totalRacesPlayed ?? 0,
    totalRacesWon: r.totalRacesWon ?? 0,
    winRate: r.winRate ?? 0,
    favoriteCategory: r.favoriteCategory ?? null,
  }
}

function formatGameForClient(
  game: Bingo | Race,
  collection: 'bingo' | 'races',
  _user: User,
  nick: string,
): any {
  const type = collection === 'bingo' ? 'bingo' : 'race'

  // Find which team the player is on
  let playerTeamIndex = -1
  for (let i = 0; i < game.teams.length; i++) {
    const found = (game.teams[i].players ?? []).some((p) => {
      const u = typeof p.user === 'object' ? p.user : null
      if (!u) return false
      return (u as User).ingameNick?.toLowerCase() === nick.toLowerCase()
    })
    if (found) {
      playerTeamIndex = i
      break
    }
  }

  const categoryEntry = DDNET_CATEGORIES.find((c) => c.value === game.category)

  // Determine creator
  const creatorObj = typeof game.createdBy === 'object' ? (game.createdBy as User) : null
  const creatorNick = creatorObj?.ingameNick ?? null
  const isCreator = creatorNick?.toLowerCase() === nick.toLowerCase()

  // Common fields
  const base = {
    type,
    id: game.id,
    title: game.title,
    mode: game.mode,
    category: game.category,
    categoryLabel: categoryEntry?.label ?? game.category,
    gameStatus: game.gameStatus,
    playerTeamIndex,
    inviteCode: game.inviteCode ?? null,
    startedAt: game.startedAt ?? null,
    completedAt: game.completedAt ?? null,
    winnerTeam: game.winnerTeam ?? null,
    creatorNick,
    isCreator,
    isPublic: game.isPublic ?? false,
    difficultyMin: game.difficultyRange?.min ?? 0,
    difficultyMax: game.difficultyRange?.max ?? 5,
    createdVia: game.createdVia ?? 'web',
  }

  if (type === 'bingo') {
    const bingo = game as Bingo
    return {
      ...base,
      gridSize: bingo.gridSize,
      winCondition: bingo.winCondition,
      maps: (bingo.maps ?? []).map((m) => ({
        name: m.mapName,
        position: m.position,
        points: m.points ?? 0,
        difficulty: m.difficulty ?? 0,
      })),
      teams: bingo.teams.map((t, i) => ({
        index: i,
        name: t.teamName,
        color: t.color,
        status: t.teamStatus,
        players: (t.players ?? []).map((p) => {
          const u = typeof p.user === 'object' ? (p.user as User) : null
          return {
            ingameNick: u?.ingameNick ?? '?',
            isReady: p.isReady ?? false,
          }
        }),
        completedCells: (t.completedCells ?? []).map((c) => ({
          position: c.cellPosition,
          completedAt: c.completedAt,
        })),
        pendingInvites: (t.pendingInvites ?? []).map((inv) => {
          const u = typeof inv.user === 'object' ? (inv.user as User) : null
          return { ingameNick: u?.ingameNick ?? '?' }
        }),
      })),
    }
  }

  // Race
  const race = game as Race
  return {
    ...base,
    serverTarget: race.server?.ip ? `${race.server.ip}:${race.server.port || 8303}` : null,
    categoryMode: race.categoryMode,
    pathLength: race.pathLength,
    currentStep: race.currentStep ?? 0,
    surrenderedByTeam: race.surrenderedByTeam ?? null,
    maps: (race.maps ?? []).map((m) => ({
      name: m.mapName,
      position: m.position,
      points: m.points ?? 0,
      difficulty: m.difficulty ?? 0,
    })),
    teams: race.teams.map((t, i) => ({
      index: i,
      name: t.teamName,
      color: t.color,
      status: t.teamStatus,
      score: t.score ?? 0,
      players: (t.players ?? []).map((p) => {
        const u = typeof p.user === 'object' ? (p.user as User) : null
        return {
          ingameNick: u?.ingameNick ?? '?',
          isReady: p.isReady ?? false,
        }
      }),
      completedSteps: (t.completedSteps ?? []).map((s) => ({
        position: s.position,
        completedAt: s.completedAt,
        finishTime: s.finishTime ?? null,
      })),
      pendingInvites: (t.pendingInvites ?? []).map((inv) => {
        const u = typeof inv.user === 'object' ? (inv.user as User) : null
        return { ingameNick: u?.ingameNick ?? '?' }
      }),
    })),
  }
}
