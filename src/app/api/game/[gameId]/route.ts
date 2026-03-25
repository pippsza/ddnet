import { NextRequest, NextResponse } from 'next/server'
import type { User, Bingo, Race, KogBingo, KogRace } from '@/payload-types'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'
import { KOG_CATEGORIES } from '@/lib/kog-constants'
import { checkWinner } from '@/services/bingo/winChecker'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { resolveOptionalAuth } from '@/services/game-actions/auth'

function formatPlayers(players: any[]) {
  return players.map((p) => {
    const playerUser = typeof p.user === 'object' ? (p.user as User) : null
    return {
      id: playerUser?.id || '',
      ingameNick: playerUser?.ingameNick || '',
      avatar: playerUser?.avatar,
      points: playerUser?.ingameStats?.points || 0,
      skin: playerUser?.ingameStats?.skin
        ? {
            name: playerUser.ingameStats.skin.name || 'default',
            colorBody: playerUser.ingameStats.skin.color_body || 0,
            colorFeet: playerUser.ingameStats.skin.color_feet || 0,
          }
        : null,
      isReady: p.isReady || false,
      roles: playerUser?.roles || 'player',
    }
  })
}

function formatPendingInvites(invites: any[]) {
  return invites.map((p) => {
    const invUser = typeof p.user === 'object' ? (p.user as User) : null
    return {
      id: invUser?.id || '',
      ingameNick: invUser?.ingameNick || '',
      skin: invUser?.ingameStats?.skin
        ? {
            name: invUser.ingameStats.skin.name || 'default',
            colorBody: invUser.ingameStats.skin.color_body || 0,
            colorFeet: invUser.ingameStats.skin.color_feet || 0,
          }
        : null,
      invitedAt: p.invitedAt,
    }
  })
}

async function resolveCategoryIcon(payload: any, category: string | undefined | null) {
  if (!category) return undefined
  const stdCat = DDNET_CATEGORIES.find((c) => c.value === category)
    ?? KOG_CATEGORIES.find((c) => c.value === category)
  if (stdCat) return stdCat.icon
  if (category.startsWith('custom_')) {
    const customGlobal = await payload.findGlobal({ slug: 'custom-categories' })
    const customCat = (customGlobal as any)?.categories?.find((c: any) => c.slug === category)
    return customCat?.icon
  }
  return undefined
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { user, payload } = await resolveOptionalAuth(req)
    const { gameId } = await params

    const resolved = await resolveGameById(payload, gameId, 3)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const { collection, game } = resolved

    // Allow bot access via X-Bot-Secret
    const botSecret = req.headers.get('X-Bot-Secret')
    const isBotRequest = botSecret === process.env.BACKEND_SECRET && !!botSecret
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id

    // Access control for private games
    if (!game.isPublic && !isBotRequest) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const isInGame = game.teams.some((team) =>
        team.players?.some((p) => {
          const pid = typeof p.user === 'string' ? p.user : p.user.id
          return pid === user.id
        }),
      )

      const isInvited = game.teams.some((team) =>
        team.pendingInvites?.some((p) => {
          const pid = typeof p.user === 'string' ? p.user : p.user.id
          return pid === user.id
        }),
      )

      if (!isInGame && !isInvited && creatorId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Format teams — shared structure with type-specific completion data
    const formattedTeams = game.teams.map((team, index) => {
      const base = {
        index,
        name: team.teamName,
        color: team.color,
        status: team.teamStatus,
        players: formatPlayers(team.players ?? []),
        pendingInvites: formatPendingInvites(team.pendingInvites ?? []),
      }

      if (collection === 'bingo' || collection === 'kog-bingo') {
        const bingoTeam = team as Bingo['teams'][number]
        return {
          ...base,
          completedCells: (bingoTeam.completedCells || []).map((c) => ({
            position: c.cellPosition,
            completedAt: c.completedAt,
          })),
        }
      } else {
        const raceTeam = team as Race['teams'][number]
        return {
          ...base,
          score: raceTeam.score || 0,
          completedSteps: (raceTeam.completedSteps || []).map((s) => ({
            position: s.position,
            completedAt: s.completedAt,
            finishTime: s.finishTime,
          })),
        }
      }
    })

    const creator = typeof game.createdBy === 'object' ? game.createdBy : null

    // Determine current user's position
    let isCurrentUserInGame = false
    let currentUserTeamIndex: number | null = null
    if (user) {
      for (let i = 0; i < game.teams.length; i++) {
        const found = game.teams[i].players?.some((p) => {
          const pid = typeof p.user === 'string' ? p.user : p.user.id
          return pid === user.id
        })
        if (found) {
          isCurrentUserInGame = true
          currentUserTeamIndex = i
          break
        }
      }
    }

    const categoryIcon = await resolveCategoryIcon(payload, game.category)

    // Shared response fields
    const shared = {
      id: game.id,
      title: game.title,
      mode: game.mode,
      category: game.category,
      categoryIcon,
      gameStatus: game.gameStatus,
      isPublic: game.isPublic,
      createdVia: game.createdVia ?? 'web',
      inviteCode: game.isPublic ? undefined : game.inviteCode,
      difficultyRange: game.difficultyRange,
      createdBy: creator ? { id: creator.id, ingameNick: creator.ingameNick } : null,
      maps: game.maps || [],
      teams: formattedTeams,
      isCurrentUserInGame,
      currentUserTeamIndex,
      currentUserId: user?.id || null,
      isCreator: user ? user.id === creatorId : false,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      duration: game.duration,
      winnerTeam: game.winnerTeam,
      rematchGameId:
        typeof game.rematchGame === 'string'
          ? game.rematchGame
          : (game.rematchGame as any)?.id || null,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }

    // Type-specific fields
    if (collection === 'bingo' || collection === 'kog-bingo') {
      const bingoGame = game as Bingo | KogBingo

      // Compute winning cells for completed games
      let winningCells: number[] | undefined
      if (bingoGame.gameStatus === 'completed' && bingoGame.winnerTeam != null) {
        const teamCells = formattedTeams.map((t, i) => ({
          teamIndex: i,
          completedCells: ((t as any).completedCells || []).map((c: any) => c.position),
        }))
        const result = checkWinner(
          bingoGame.gridSize as '3x3' | '5x5' | '7x7',
          bingoGame.winCondition as 'line' | 'cross' | 'full_house',
          teamCells,
        )
        winningCells = result.winningCells
      }

      return NextResponse.json({
        ...shared,
        collection,
        gridSize: bingoGame.gridSize,
        winCondition: bingoGame.winCondition,
        winningCells,
      })
    } else {
      const raceGame = game as Race | KogRace

      return NextResponse.json({
        ...shared,
        collection,
        categoryMode: (raceGame as Race).categoryMode ?? 'selected',
        pathLength: raceGame.pathLength,
        server: (raceGame as Race).server,
        currentStep: raceGame.currentStep,
        currentMap: raceGame.currentMap,
        surrenderedByTeam: (raceGame as any).surrenderedByTeam ?? null,
      })
    }
  } catch (error: unknown) {
    console.error('[API] Error fetching game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? (error as Error).message : 'Failed to fetch game' },
      { status: 500 },
    )
  }
}
