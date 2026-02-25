import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Race } from '@/payload-types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 2 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Find player and toggle ready
    let playerTeamIndex = -1
    let playerIndex = -1

    for (let t = 0; t < game.teams.length; t++) {
      const pIndex = game.teams[t].players?.findIndex((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })
      if (pIndex !== undefined && pIndex >= 0) {
        playerTeamIndex = t
        playerIndex = pIndex
        break
      }
    }

    if (playerTeamIndex === -1) {
      return NextResponse.json({ error: 'You are not in this race' }, { status: 400 })
    }

    const player = game.teams[playerTeamIndex].players![playerIndex]
    player.isReady = !player.isReady

    // Check if all players ready
    let allReady = true
    let totalPlayers = 0

    for (const team of game.teams) {
      const players = team.players ?? []
      if (players.length === 0) {
        allReady = false
        break
      }
      totalPlayers += players.length
      for (const p of players) {
        if (!p.isReady) {
          allReady = false
          break
        }
      }
      if (!allReady) break
    }

    let newGameStatus: Race['gameStatus'] = game.gameStatus

    if (allReady && totalPlayers >= 1) {
      const minPlayersPerTeam = game.mode === 'team' ? 1 : 0
      let canStart = true
      for (const team of game.teams) {
        if (game.mode === 'team' && (team.players ?? []).length < minPlayersPerTeam) {
          canStart = false
          break
        }
        team.teamStatus = 'ready'
      }
      if (canStart) newGameStatus = 'ready'
    }

    await payload.update({
      collection: 'races',
      id: gameId,
      data: { teams: game.teams, gameStatus: newGameStatus },
    })

    return NextResponse.json({
      success: true,
      isReady: player.isReady,
      allReady,
      gameStatus: newGameStatus,
    })
  } catch (error: any) {
    console.error('[API] Error toggling ready:', error)
    return NextResponse.json({ error: error.message || 'Failed to toggle ready' }, { status: 500 })
  }
}
