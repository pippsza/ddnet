import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo } from '@/payload-types'

interface JoinGameRequest {
  teamIndex?: number // 0 or 1 for team mode
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })

    // Check authentication
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const body: JoinGameRequest = await req.json()

    // Get game
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if game is joinable
    if (game.gameStatus !== 'waiting') {
      return NextResponse.json({ error: 'Game is not accepting new players' }, { status: 400 })
    }

    // Check if user already in game
    for (const team of game.teams) {
      if (
        team.players?.some((p) => {
          const playerId = typeof p.user === 'string' ? p.user : p.user.id
          return playerId === user.id
        })
      ) {
        return NextResponse.json({ error: 'You are already in this game' }, { status: 400 })
      }
    }

    // Determine which team to join
    let targetTeamIndex: number

    if (game.mode === 'solo') {
      // Solo mode: join the only team (index 0)
      targetTeamIndex = 0
    } else {
      // Team mode: use provided teamIndex or find team with space
      if (body.teamIndex !== undefined) {
        targetTeamIndex = body.teamIndex
      } else {
        // Find team with less players
        targetTeamIndex = game.teams[0].players.length <= game.teams[1].players.length ? 0 : 1
      }
    }

    const targetTeam = game.teams[targetTeamIndex]

    // Check if team is full (max 2 players per team)
    if (targetTeam.players.length >= 2) {
      return NextResponse.json({ error: 'This team is full' }, { status: 400 })
    }

    // Add player to team
    targetTeam.players.push({
      user: user.id,
      isReady: false,
    })

    // Update game
    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: {
        teams: game.teams,
      },
    })

    // Update user's active game
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        activeGame: { relationTo: 'bingo', value: gameId },
      },
    })

    return NextResponse.json({
      success: true,
      teamIndex: targetTeamIndex,
      message: `Joined ${targetTeam.teamName}`,
    })
  } catch (error: any) {
    console.error('[API] Error joining bingo game:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to join game',
      },
      { status: 500 },
    )
  }
}
