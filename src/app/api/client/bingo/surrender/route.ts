import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateClientToken(req)
    if (authResult instanceof NextResponse) return authResult
    const { user, payload } = authResult

    const { gameId } = (await req.json()) as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const game = await payload.findByID({ collection: 'bingo', id: gameId, depth: 1 })

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

    const isSolo = game.mode === 'solo'
    let winnerTeamIndex: number | null = null

    if (!isSolo) {
      winnerTeamIndex = userTeamIndex === 0 ? 1 : 0
    }

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

    // Clear activeGame for all players
    const playerIds = (game.teams ?? []).flatMap((team) =>
      (team.players ?? []).map((p) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    for (const playerId of playerIds) {
      await payload.update({
        collection: 'users',
        id: playerId,
        data: { activeGame: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error surrendering bingo game (client):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to surrender' },
      { status: 500 },
    )
  }
}
