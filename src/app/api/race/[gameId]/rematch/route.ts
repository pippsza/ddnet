import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateRacePath } from '@/services/race/pathGenerator'
import type { Race } from '@/payload-types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'completed' && game.gameStatus !== 'cancelled') {
      return NextResponse.json({ error: 'Can only rematch a finished race' }, { status: 400 })
    }

    const wasInGame = game.teams.some((team) =>
      team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      }),
    )
    if (!wasInGame) {
      return NextResponse.json({ error: 'You were not in this race' }, { status: 403 })
    }

    // Block if user already has an active game
    const freshUser = await payload.findByID({ collection: 'users', id: user.id })
    if (freshUser.activeGame) {
      const ref = freshUser.activeGame as { relationTo: string; value: string | { id: string } }
      const refId = typeof ref.value === 'object' ? ref.value.id : ref.value
      if (refId !== gameId) {
        return NextResponse.json(
          { error: 'You already have an active game. Finish or leave it first.' },
          { status: 400 },
        )
      }
      await payload.update({ collection: 'users', id: user.id, data: { activeGame: null } })
    }

    // Check for existing rematch
    const existingRematchId =
      typeof game.rematchGame === 'string' ? game.rematchGame : game.rematchGame?.id

    if (existingRematchId) {
      const rematchGame = await payload.findByID({
        collection: 'races',
        id: existingRematchId,
        depth: 1,
      })

      if (
        rematchGame &&
        (rematchGame.gameStatus === 'waiting' || rematchGame.gameStatus === 'ready')
      ) {
        const alreadyIn = rematchGame.teams.some((team) =>
          team.players?.some((p) => {
            const pid = typeof p.user === 'string' ? p.user : p.user.id
            return pid === user.id
          }),
        )

        if (alreadyIn) {
          await payload.update({
            collection: 'users',
            id: user.id,
            data: { activeGame: { relationTo: 'races', value: existingRematchId } },
          })
          return NextResponse.json({ success: true, gameId: existingRematchId })
        }

        // Find empty team first, then team with space
        let targetTeamIndex = -1
        if (rematchGame.mode === 'solo') {
          if ((rematchGame.teams[0].players ?? []).length < 2) targetTeamIndex = 0
        } else {
          for (let i = 0; i < rematchGame.teams.length; i++) {
            if ((rematchGame.teams[i].players ?? []).length === 0) {
              targetTeamIndex = i
              break
            }
          }
          if (targetTeamIndex < 0) {
            for (let i = 0; i < rematchGame.teams.length; i++) {
              if ((rematchGame.teams[i].players ?? []).length < 2) {
                targetTeamIndex = i
                break
              }
            }
          }
        }

        if (targetTeamIndex >= 0) {
          const updatedTeams = rematchGame.teams.map((team, idx) => {
            if (idx !== targetTeamIndex) return team
            return {
              ...team,
              players: [...(team.players ?? []), { user: user.id, isReady: false }],
              pendingInvites: (team.pendingInvites ?? []).filter((p) => {
                const pid = typeof p.user === 'string' ? p.user : p.user.id
                return pid !== user.id
              }),
            }
          })

          await payload.update({
            collection: 'races',
            id: existingRematchId,
            data: { teams: updatedTeams },
          })

          await payload.update({
            collection: 'users',
            id: user.id,
            data: { activeGame: { relationTo: 'races', value: existingRematchId } },
          })

          return NextResponse.json({ success: true, gameId: existingRematchId })
        }
      }
    }

    // Generate new path for selected mode
    let maps: Race['maps'] = []
    if (game.categoryMode !== 'free') {
      maps = await generateRacePath({
        category: game.category,
        pathLength: game.pathLength,
        difficultyMin: game.difficultyRange?.min ?? 0,
        difficultyMax: game.difficultyRange?.max ?? 5,
      })
    }

    const teams: Race['teams'] = [
      {
        teamName: game.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: game.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      },
    ]

    if (game.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: game.teams[1]?.color || 'blue',
        players: [],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      })
    }

    const newGame = await payload.create({
      collection: 'races',
      data: {
        title: game.title,
        mode: game.mode,
        categoryMode: game.categoryMode,
        category: game.category,
        pathLength: game.pathLength,
        isPublic: false,
        difficultyRange: game.difficultyRange,
        server: game.server,
        createdBy: user.id,
        createdVia: game.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
        currentStep: 0,
      },
    })

    await payload.update({
      collection: 'races',
      id: gameId,
      data: { rematchGame: newGame.id },
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: 'races', value: newGame.id } },
    })

    // Notify other players
    const otherPlayerIds = game.teams.flatMap((team) =>
      (team.players ?? [])
        .map((p) => (typeof p.user === 'string' ? p.user : p.user.id))
        .filter((pid) => pid !== user.id),
    )

    for (const playerId of otherPlayerIds) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: playerId,
            type: 'game_invite',
            title: 'Rematch!',
            message: `${user.ingameNick || user.username} wants a rematch in ${game.title}`,
            actionUrl: `/app/race/${newGame.id}`,
            relatedGame: { relationTo: 'races', value: newGame.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'race',
              inviteCode: newGame.inviteCode,
            },
          },
        })
      } catch {
        // ignore notification errors
      }
    }

    return NextResponse.json({ success: true, gameId: newGame.id })
  } catch (error: any) {
    console.error('[API] Error creating race rematch:', error)
    return NextResponse.json({ error: error.message || 'Failed to create rematch' }, { status: 500 })
  }
}
