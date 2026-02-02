import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, User } from '@/payload-types'

export async function GET(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const payload = await getPayload({ config })

    const { gameId } = params

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

      const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id

      if (!isInGame && creatorId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Format response
    const formattedTeams = game.teams.map((team, index) => ({
      index,
      name: team.teamName,
      color: team.color,
      status: team.teamStatus,
      players: team.players.map((p) => {
        const playerUser = typeof p.user === 'object' ? p.user : null
        return {
          id: playerUser?.id || '',
          username: playerUser?.username || '',
          avatar: playerUser?.avatar,
          isReady: p.isReady || false,
        }
      }),
      completedCells: (team.completedCells || []).map((c) => ({
        position: c.cellPosition,
        completedAt: c.completedAt,
      })),
    }))

    const creator = typeof game.createdBy === 'object' ? game.createdBy : null

    return NextResponse.json({
      id: game.id,
      title: game.title,
      mode: game.mode,
      category: game.category,
      subcategory: game.subcategory,
      gridSize: game.gridSize,
      winCondition: game.winCondition,
      gameStatus: game.gameStatus,
      isPublic: game.isPublic,
      inviteCode: game.isPublic ? undefined : game.inviteCode,
      difficultyRange: game.difficultyRange,
      createdBy: creator
        ? {
            id: creator.id,
            username: creator.username,
          }
        : null,
      maps: game.maps,
      teams: formattedTeams,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      duration: game.duration,
      winnerTeam: game.winnerTeam,
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
