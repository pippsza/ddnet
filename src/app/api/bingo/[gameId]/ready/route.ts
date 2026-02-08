import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, User } from '@/payload-types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })

    // Check authentication
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params

    // Get game
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if user is in game
    let playerTeamIndex = -1
    let playerIndex = -1

    for (let t = 0; t < game.teams.length; t++) {
      const pIndex = game.teams[t].players?.findIndex((p) => {
        const playerId = typeof p.user === 'string' ? p.user : p.user.id
        return playerId === user.id
      })
      if (pIndex !== undefined && pIndex >= 0) {
        playerTeamIndex = t
        playerIndex = pIndex
        break
      }
    }

    if (playerTeamIndex === -1) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 400 })
    }

    // Toggle ready status
    const player = game.teams[playerTeamIndex].players[playerIndex]
    player.isReady = !player.isReady

    // Check if all players in all teams are ready
    let allReady = true
    let totalPlayers = 0

    for (const team of game.teams) {
      if (team.players.length === 0) {
        allReady = false
        break
      }

      totalPlayers += team.players.length

      for (const p of team.players) {
        if (!p.isReady) {
          allReady = false
          break
        }
      }

      if (!allReady) break
    }

    // Update game status if all ready
    let newGameStatus: Bingo['gameStatus'] = game.gameStatus

    if (allReady && totalPlayers >= 1) {
      // Solo mode: need at least 1 player ready
      // Team mode: need at least 1 player per team
      const minPlayersPerTeam = game.mode === 'team' ? 1 : 0

      let canStart = true
      for (const team of game.teams) {
        if (game.mode === 'team' && team.players.length < minPlayersPerTeam) {
          canStart = false
          break
        }
        team.teamStatus = 'ready'
      }

      if (canStart) {
        newGameStatus = 'ready'
      }
    }

    // Update game
    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: {
        teams: game.teams,
        gameStatus: newGameStatus,
      },
    })

    return NextResponse.json({
      success: true,
      isReady: player.isReady,
      allReady,
      gameStatus: newGameStatus,
    })
  } catch (error: any) {
    console.error('[API] Error toggling ready:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update ready status',
      },
      { status: 500 },
    )
  }
}
