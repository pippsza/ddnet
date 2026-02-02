import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, User } from '@/payload-types'
import type { Where } from 'payload'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') // solo or team
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'waiting' // waiting, ready, in_progress
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    const whereConditions: Where[] = [
      {
        isPublic: {
          equals: true,
        },
      },
      {
        gameStatus: {
          equals: status,
        },
      },
    ]

    if (mode) {
      whereConditions.push({
        mode: {
          equals: mode,
        },
      })
    }

    if (category) {
      whereConditions.push({
        category: {
          equals: category,
        },
      })
    }

    const where: Where = {
      and: whereConditions,
    }

    // Get public games
    const { docs: games, totalDocs } = await payload.find({
      collection: 'bingo',
      where,
      limit,
      depth: 2,
      sort: '-createdAt',
    })

    // Format response
    const formattedGames = games.map((game) => {
      const totalPlayers = game.teams.reduce((sum, team) => sum + (team.players?.length || 0), 0)
      const maxPlayers = game.mode === 'solo' ? 2 : 4
      const creator = typeof game.createdBy === 'object' ? game.createdBy : null

      return {
        id: game.id,
        title: game.title,
        mode: game.mode,
        category: game.category,
        subcategory: game.subcategory,
        gridSize: game.gridSize,
        winCondition: game.winCondition,
        gameStatus: game.gameStatus,
        createdBy: creator
          ? {
              id: creator.id,
              username: creator.username,
            }
          : null,
        players: totalPlayers,
        maxPlayers,
        createdAt: game.createdAt,
      }
    })

    return NextResponse.json({
      games: formattedGames,
      total: totalDocs,
    })
  } catch (error: any) {
    console.error('[API] Error fetching lobby games:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch games',
      },
      { status: 500 },
    )
  }
}
