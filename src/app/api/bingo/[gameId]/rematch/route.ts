import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateBingoGrid } from '@/services/bingo/gridGenerator'
import type { Bingo } from '@/payload-types'

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

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'completed' && game.gameStatus !== 'cancelled') {
      return NextResponse.json({ error: 'Can only rematch a finished game' }, { status: 400 })
    }

    // Check user was in the game
    const wasInGame = game.teams.some((team) =>
      team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      }),
    )
    if (!wasInGame) {
      return NextResponse.json({ error: 'You were not in this game' }, { status: 403 })
    }

    // Block if user already has an active game (unless it's the same finished game — stale ref)
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
      // Clear stale reference pointing to this finished game
      await payload.update({ collection: 'users', id: user.id, data: { activeGame: null } })
    }

    // Check if a rematch game already exists for this game
    const existingRematchId =
      typeof game.rematchGame === 'string'
        ? game.rematchGame
        : game.rematchGame?.id

    if (existingRematchId) {
      // A rematch was already created — try to join it
      const rematchGame = await payload.findByID({
        collection: 'bingo',
        id: existingRematchId,
        depth: 1,
      })

      if (
        rematchGame &&
        (rematchGame.gameStatus === 'waiting' || rematchGame.gameStatus === 'ready')
      ) {
        // Check if user is already in the rematch game
        const alreadyIn = rematchGame.teams.some((team) =>
          team.players?.some((p) => {
            const pid = typeof p.user === 'string' ? p.user : p.user.id
            return pid === user.id
          }),
        )

        if (alreadyIn) {
          // Set active game and redirect
          await payload.update({
            collection: 'users',
            id: user.id,
            data: { activeGame: { relationTo: 'bingo', value: existingRematchId } },
          })
          return NextResponse.json({ success: true, gameId: existingRematchId })
        }

        // Find a team with space and join
        let targetTeamIndex = -1
        if (rematchGame.mode === 'solo') {
          if ((rematchGame.teams[0].players ?? []).length < 2) targetTeamIndex = 0
        } else {
          // For team mode, prefer empty teams first so opponents land on separate teams
          for (let i = 0; i < rematchGame.teams.length; i++) {
            if ((rematchGame.teams[i].players ?? []).length === 0) {
              targetTeamIndex = i
              break
            }
          }
          // If no empty team, find one with space for a teammate
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
            collection: 'bingo',
            id: existingRematchId,
            data: { teams: updatedTeams },
          })

          await payload.update({
            collection: 'users',
            id: user.id,
            data: { activeGame: { relationTo: 'bingo', value: existingRematchId } },
          })

          return NextResponse.json({ success: true, gameId: existingRematchId })
        }
      }
      // If rematch game is full, started, or gone — fall through to create a new one
    }

    // Generate new grid with same settings
    const maps = await generateBingoGrid({
      category: game.category,
      gridSize: game.gridSize,
      difficultyMin: game.difficultyRange?.min ?? 0,
      difficultyMax: game.difficultyRange?.max ?? 5,
    })

    // Create new game with same settings
    const teams: Bingo['teams'] = [
      {
        teamName: game.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: game.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        completedCells: [],
        teamStatus: 'not_ready',
      },
    ]

    if (game.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: game.teams[1]?.color || 'blue',
        players: [],
        completedCells: [],
        teamStatus: 'not_ready',
      })
    }

    const newGame = await payload.create({
      collection: 'bingo',
      data: {
        title: game.title,
        mode: game.mode,
        category: game.category,
        gridSize: game.gridSize,
        winCondition: game.winCondition,
        isPublic: false,
        difficultyRange: game.difficultyRange,
        createdBy: user.id,
        createdVia: game.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
      },
    })

    // Link rematch game on the original
    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: { rematchGame: newGame.id },
    })

    // Set active game for creator
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        activeGame: { relationTo: 'bingo', value: newGame.id },
      },
    })

    // Invite all other players from the original game
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
            actionUrl: `/app/bingo/${newGame.id}`,
            relatedGame: { relationTo: 'bingo', value: newGame.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'bingo',
              inviteCode: newGame.inviteCode,
            },
          },
        })
      } catch {
        // ignore notification errors
      }
    }

    return NextResponse.json({
      success: true,
      gameId: newGame.id,
    })
  } catch (error: any) {
    console.error('[API] Error creating rematch:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create rematch' },
      { status: 500 },
    )
  }
}
