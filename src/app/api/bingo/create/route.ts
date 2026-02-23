import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import type { Bingo } from '@/payload-types'

interface CreateGameRequest {
  title: string
  mode: 'solo' | 'team'
  category: string
  subcategory?: string
  gridSize: '3x3' | '5x5' | '7x7'
  winCondition: 'line' | 'cross' | 'full_house'
  isPublic: boolean
  difficultyMin: number
  difficultyMax: number
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
      subcategory: body.subcategory,
      gridSize: body.gridSize,
      difficultyMin: body.difficultyMin || 0,
      difficultyMax: body.difficultyMax || 5,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check if user already has active game
    const { docs: existingGames } = await payload.find({
      collection: 'bingo',
      where: {
        and: [
          {
            createdBy: {
              equals: user.id,
            },
          },
          {
            gameStatus: {
              in: ['waiting', 'ready', 'in_progress'],
            },
          },
        ],
      },
    })

    if (existingGames.length >= MAX_ACTIVE_GAMES_PER_USER) {
      return NextResponse.json(
        {
          error: `You can only have ${MAX_ACTIVE_GAMES_PER_USER} active game(s) at a time`,
        },
        { status: 400 },
      )
    }

    // Generate grid maps
    const maps = await generateBingoGrid({
      category: body.category,
      subcategory: body.subcategory,
      gridSize: body.gridSize,
      difficultyMin: body.difficultyMin || 0,
      difficultyMax: body.difficultyMax || 5,
    })

    // Create initial team structure
    const teams: Bingo['teams'] = [
      {
        teamName: body.mode === 'solo' ? `${user.username}'s Team` : 'Team 1',
        color: 'red',
        players: [
          {
            user: user.id,
            isReady: false,
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
        subcategory: body.subcategory as Bingo['subcategory'],
        gridSize: body.gridSize,
        winCondition: body.winCondition,
        isPublic: body.isPublic,
        difficultyRange: {
          min: body.difficultyMin || 0,
          max: body.difficultyMax || 5,
        },
        createdBy: user.id,
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
