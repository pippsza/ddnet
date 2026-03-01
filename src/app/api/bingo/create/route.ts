import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import type { Bingo } from '@/payload-types'

interface CreateGameRequest {
  title: string
  mode: 'solo' | 'team'
  category: string
  gridSize: '3x3' | '5x5' | '7x7'
  winCondition: 'line' | 'cross' | 'full_house'
  isPublic: boolean
  difficultyMin: number
  difficultyMax: number
  invitedPlayerId?: string
  invitedTeammateId?: string
}

const MAX_ACTIVE_GAMES_PER_USER = parseInt(process.env.MAX_ACTIVE_GAMES_PER_USER || '1')

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Check authentication
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: CreateGameRequest = await req.json()

    // Validate required fields
    if (!body.title || !body.mode || !body.category || !body.gridSize || !body.winCondition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate grid options
    const validation = validateGridOptions({
      category: body.category,
      gridSize: body.gridSize,
      difficultyMin: body.difficultyMin || 0,
      difficultyMax: body.difficultyMax || 5,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Block if user already has an active game (bingo or race)
    // Auto-clear stale references to completed/cancelled games
    if (user.activeGame) {
      const ref = user.activeGame as { relationTo: string; value: string | { id: string } }
      const refId = typeof ref.value === 'object' ? ref.value.id : ref.value
      let isStale = false
      try {
        const activeDoc = await payload.findByID({
          collection: ref.relationTo as 'bingo' | 'races',
          id: refId,
          depth: 0,
        })
        const status = (activeDoc as any)?.gameStatus
        if (!activeDoc || status === 'completed' || status === 'cancelled') {
          isStale = true
        }
      } catch {
        isStale = true
      }

      if (isStale) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { activeGame: null },
        })
      } else {
        return NextResponse.json(
          { error: 'You already have an active game. Finish or leave it before creating a new one.' },
          { status: 400 },
        )
      }
    }

    // Generate grid maps
    const maps = await generateBingoGrid({
      category: body.category,
      gridSize: body.gridSize,
      difficultyMin: body.difficultyMin || 0,
      difficultyMax: body.difficultyMax || 5,
    })

    // Create initial team structure
    const teams: Bingo['teams'] = [
      {
        teamName: body.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: 'red',
        players: [
          {
            user: user.id,
            isReady: true,
          },
        ],
        completedCells: [],
        teamStatus: 'not_ready',
      },
    ]

    // Add second team for team mode
    if (body.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: 'blue',
        players: [],
        completedCells: [],
        teamStatus: 'not_ready',
      })
    }

    // Create game
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
        createdVia: 'web',
        maps,
        teams,
        gameStatus: 'waiting',
      },
    })

    // Update user's active game reference
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        activeGame: { relationTo: 'bingo', value: game.id },
      },
    })

    // Send invite notifications
    const inviteTargets: { id: string; teamIndex: number }[] = []
    if (body.invitedTeammateId) inviteTargets.push({ id: body.invitedTeammateId, teamIndex: 0 })
    if (body.invitedPlayerId) inviteTargets.push({ id: body.invitedPlayerId, teamIndex: 1 })

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

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        title: game.title,
        mode: game.mode,
        inviteCode: game.inviteCode,
        isPublic: game.isPublic,
      },
    })
  } catch (error: any) {
    console.error('[API] Error creating bingo game:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to create game',
      },
      { status: 500 },
    )
  }
}
