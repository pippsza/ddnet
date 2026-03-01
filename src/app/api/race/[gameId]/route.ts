import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { gameId } = await params

    const game = await payload.findByID({
      collection: 'races',
      id: gameId,
      depth: 3,
    })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Allow bot access via X-Bot-Secret
    const botSecret = req.headers.get('X-Bot-Secret')
    const isBotRequest = botSecret === process.env.BACKEND_SECRET && !!botSecret

    const { user } = await payload.auth({ headers: req.headers })
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id

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

    const formattedTeams = game.teams.map((team, index) => ({
      index,
      name: team.teamName,
      color: team.color,
      status: team.teamStatus,
      score: team.score || 0,
      players: (team.players ?? []).map((p) => {
        const playerUser = typeof p.user === 'object' ? (p.user as User) : null
        return {
          id: playerUser?.id || '',
          ingameNick: playerUser?.ingameNick || '',
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
      completedSteps: (team.completedSteps || []).map((s) => ({
        position: s.position,
        completedAt: s.completedAt,
        finishTime: s.finishTime,
      })),
    }))

    const creator = typeof game.createdBy === 'object' ? game.createdBy : null

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
      categoryMode: game.categoryMode,
      category: game.category,
      categoryIcon,
      pathLength: game.pathLength,
      gameStatus: game.gameStatus,
      isPublic: game.isPublic,
      createdVia: game.createdVia ?? 'web',
      inviteCode: game.isPublic ? undefined : game.inviteCode,
      difficultyRange: game.difficultyRange,
      server: game.server,
      createdBy: creator
        ? { id: creator.id, ingameNick: creator.ingameNick }
        : null,
      maps: game.maps || [],
      teams: formattedTeams,
      isCurrentUserInGame,
      currentUserTeamIndex,
      currentUserId: user?.id || null,
      isCreator: user ? user.id === creatorId : false,
      currentStep: game.currentStep,
      currentMap: game.currentMap,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      duration: game.duration,
      winnerTeam: game.winnerTeam,
      surrenderedByTeam: (game as any).surrenderedByTeam ?? null,
      rematchGameId: typeof game.rematchGame === 'string'
        ? game.rematchGame
        : game.rematchGame?.id || null,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    })
  } catch (error: any) {
    console.error('[API] Error fetching race:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch race' },
      { status: 500 },
    )
  }
}
