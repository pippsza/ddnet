import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'
import { checkWinner } from '@/services/bingo/winChecker'

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })

    const { gameId } = await params

    // Get game with populated relationships
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 3,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if game is public or if user has access
    const { user } = await payload.auth({ headers: req.headers })
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id

    if (!game.isPublic) {
      // Private game - check if user is in game
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const isInGame = game.teams.some((team) =>
        team.players?.some((p) => {
          const playerId = typeof p.user === 'string' ? p.user : p.user.id
          return playerId === user.id
        }),
      )

      const isInvited = game.teams.some((team) =>
        team.pendingInvites?.some((p) => {
          const playerId = typeof p.user === 'string' ? p.user : p.user.id
          return playerId === user.id
        }),
      )

      if (!isInGame && !isInvited && creatorId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Format response
    const formattedTeams = game.teams.map((team, index) => ({
      index,
      name: team.teamName,
      color: team.color,
      status: team.teamStatus,
      players: (team.players ?? []).map((p) => {
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
      }),
      pendingInvites: (team.pendingInvites ?? []).map((p) => {
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
      }),
      completedCells: (team.completedCells || []).map((c) => ({
        position: c.cellPosition,
        completedAt: c.completedAt,
      })),
    }))

    const creator = typeof game.createdBy === 'object' ? game.createdBy : null

    // Determine current user's position in the game
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

    // Compute winning cells for completed games
    let winningCells: number[] | undefined
    if (game.gameStatus === 'completed' && game.winnerTeam != null) {
      const teamCells = formattedTeams.map((t, i) => ({
        teamIndex: i,
        completedCells: t.completedCells.map((c) => c.position),
      }))
      const result = checkWinner(
        game.gridSize as '3x3' | '5x5' | '7x7',
        game.winCondition as 'line' | 'cross' | 'full_house',
        teamCells,
      )
      winningCells = result.winningCells
    }

    // Resolve category icon
    let categoryIcon: string | undefined
    const stdCat = DDNET_CATEGORIES.find((c) => c.value === game.category)
    if (stdCat) {
      categoryIcon = stdCat.icon
    } else if (game.category?.startsWith('custom_')) {
      const customGlobal = await payload.findGlobal({ slug: 'custom-categories' })
      const customCat = (customGlobal as any)?.categories?.find(
        (c: any) => c.slug === game.category,
      )
      categoryIcon = customCat?.icon
    }

    return NextResponse.json({
      id: game.id,
      title: game.title,
      mode: game.mode,
      category: game.category,
      categoryIcon,
      gridSize: game.gridSize,
      winCondition: game.winCondition,
      gameStatus: game.gameStatus,
      isPublic: game.isPublic,
      createdVia: game.createdVia ?? 'web',
      inviteCode: game.isPublic ? undefined : game.inviteCode,
      difficultyRange: game.difficultyRange,
      createdBy: creator
        ? {
            id: creator.id,
            ingameNick: creator.ingameNick,
          }
        : null,
      maps: game.maps,
      teams: formattedTeams,
      isCurrentUserInGame,
      currentUserTeamIndex,
      currentUserId: user?.id || null,
      isCreator: user ? user.id === creatorId : false,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      duration: game.duration,
      winnerTeam: game.winnerTeam,
      winningCells,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    })
  } catch (error: any) {
    console.error('[API] Error fetching game:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch game',
      },
      { status: 500 },
    )
  }
}
