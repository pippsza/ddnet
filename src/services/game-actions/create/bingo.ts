import type { Payload } from 'payload'
import type { User, Bingo } from '@/payload-types'
import type { ActionResult, CreateOptions } from '../types'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import { checkAndClearStaleActiveGame } from '../helpers'

interface CreateBingoBody {
  title: string
  mode: 'solo' | 'team'
  category: string
  gridSize: '3x3' | '5x5' | '7x7'
  winCondition: 'line' | 'cross' | 'full_house'
  isPublic: boolean
  difficultyMin: number
  difficultyMax: number
}

export async function handleCreateBingo(
  auth: { user: User; payload: Payload },
  body: CreateBingoBody,
  options: CreateOptions,
): Promise<ActionResult> {
  const { user, payload } = auth

  if (!body.title || !body.mode || !body.category || !body.gridSize || !body.winCondition) {
    return { error: 'Missing required fields', status: 400 }
  }

  const validation = validateGridOptions({
    category: body.category,
    gridSize: body.gridSize,
    difficultyMin: body.difficultyMin || 0,
    difficultyMax: body.difficultyMax || 5,
  })
  if (!validation.valid) {
    return { error: validation.error!, status: 400 }
  }

  const { hasActiveGame } = await checkAndClearStaleActiveGame(payload, user)
  if (hasActiveGame) {
    return {
      error: 'You already have an active game. Finish or leave it before creating a new one.',
      status: 400,
    }
  }

  const maps = await generateBingoGrid({
    category: body.category,
    gridSize: body.gridSize,
    difficultyMin: body.difficultyMin || 0,
    difficultyMax: body.difficultyMax || 5,
  })

  const teams: Bingo['teams'] = [
    {
      teamName: body.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
      color: 'red',
      players: [{ user: user.id, isReady: true }],
      completedCells: [],
      teamStatus: 'not_ready',
    },
  ]

  if (body.mode === 'team') {
    teams.push({
      teamName: 'Team 2',
      color: 'blue',
      players: [],
      completedCells: [],
      teamStatus: 'not_ready',
    })
  }

  const game = await payload.create({
    collection: 'bingo',
    data: {
      title: body.title,
      mode: body.mode,
      category: body.category as Bingo['category'],
      gridSize: body.gridSize,
      winCondition: body.winCondition,
      isPublic: body.isPublic,
      difficultyRange: {
        min: body.difficultyMin || 0,
        max: body.difficultyMax || 5,
      },
      createdBy: user.id,
      createdVia: options.createdVia,
      maps,
      teams,
      gameStatus: 'waiting',
    },
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: { relationTo: 'bingo', value: game.id } },
  })

  // Send invite notifications (web only)
  if (options.invitedPlayerId || options.invitedTeammateId) {
    const inviteTargets: { id: string; teamIndex: number }[] = []
    if (options.invitedTeammateId) inviteTargets.push({ id: options.invitedTeammateId, teamIndex: 0 })
    if (options.invitedPlayerId) inviteTargets.push({ id: options.invitedPlayerId, teamIndex: 1 })

    for (const target of inviteTargets) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: target.id,
            type: 'game_invite',
            title: 'Game Invite',
            message: `${user.ingameNick || user.username} invited you to ${body.title}`,
            actionUrl: `/app/bingo/${game.id}?team=${target.teamIndex}`,
            relatedGame: { relationTo: 'bingo', value: game.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'bingo',
              inviteCode: game.inviteCode,
              teamIndex: target.teamIndex,
            },
          },
        })
      } catch (inviteErr) {
        console.error('[API] Error sending invite notification:', inviteErr)
      }
    }
  }

  return {
    success: true,
    data: {
      success: true,
      game: {
        id: game.id,
        title: game.title,
        mode: game.mode,
        inviteCode: game.inviteCode,
        isPublic: game.isPublic,
      },
    },
  }
}
