import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    if (game.gameStatus !== 'in_progress') {
      return NextResponse.json({ error: 'Can only surrender an in-progress game' }, { status: 400 })
    }

    // Find which team the user is on
    let userTeamIndex = -1
    for (let i = 0; i < game.teams.length; i++) {
      const found = game.teams[i].players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })
      if (found) {
        userTeamIndex = i
        break
      }
    }

    if (userTeamIndex === -1) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 403 })
    }

    // Determine winner: the OTHER team wins
    // For solo mode (1 team), surrender just cancels
    const isSolo = game.mode === 'solo'
    let winnerTeamIndex: number | null = null

    if (isSolo) {
      // Solo: no opponent team to win, just cancel
      winnerTeamIndex = null
    } else {
      // Team mode: opponent wins
      winnerTeamIndex = userTeamIndex === 0 ? 1 : 0
    }

    // Update team statuses
    const updatedTeams = game.teams.map((team, idx) => ({
      ...team,
      teamStatus: (isSolo
        ? 'loser'
        : idx === winnerTeamIndex
          ? 'winner'
          : 'loser') as 'winner' | 'loser',
    }))

    const now = new Date().toISOString()
    const startTime = game.startedAt ? new Date(game.startedAt).getTime() : Date.now()
    const duration = Math.floor((Date.now() - startTime) / 1000)

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: {
        gameStatus: isSolo ? 'cancelled' : 'completed',
        teams: updatedTeams,
        winnerTeam: winnerTeamIndex,
        completedAt: now,
        duration,
      },
    })

    // Clear activeGame and add to completedGames for all players
    const playerIds = (game.teams ?? []).flatMap((team) =>
      (team.players ?? []).map((p) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    for (const playerId of playerIds) {
      const playerUser = await payload.findByID({ collection: 'users', id: playerId })
      const existing = (playerUser.completedGames as any[]) || []
      await payload.update({
        collection: 'users',
        id: playerId,
        data: {
          activeGame: null,
          completedGames: [...existing, { relationTo: 'bingo', value: gameId }],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error surrendering bingo game:', error)
    return NextResponse.json({ error: 'Failed to surrender' }, { status: 500 })
  }
}
