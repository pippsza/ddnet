import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import type { Bingo } from '@/payload-types'

interface CreateBingoRequest {
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

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user, payload } = auth

    const body: CreateBingoRequest = await req.json()

    if (!body.title || !body.mode || !body.category || !body.gridSize || !body.winCondition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    // Block if user already has an active game, auto-clear stale references
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

    const maps = await generateBingoGrid({
      category: body.category,
      subcategory: body.subcategory,
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
    console.error('[API] Error creating bingo game (client):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create game' },
      { status: 500 },
    )
  }
}
