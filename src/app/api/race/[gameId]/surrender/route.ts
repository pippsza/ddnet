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
    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'in_progress') {
      return NextResponse.json({ error: 'Can only surrender an in-progress race' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'You are not in this race' }, { status: 403 })
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

    // Update DB first so the bot can read the final state before shutting down
    await payload.update({
      collection: 'races',
      id: gameId,
      data: {
        gameStatus: isSolo ? 'cancelled' : 'completed',
        teams: updatedTeams,
        winnerTeam: winnerTeamIndex,
        surrenderedByTeam: userTeamIndex,
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
          completedGames: [...existing, { relationTo: 'races', value: gameId }],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error surrendering race:', error)
    return NextResponse.json({ error: error.message || 'Failed to surrender' }, { status: 500 })
  }
}
