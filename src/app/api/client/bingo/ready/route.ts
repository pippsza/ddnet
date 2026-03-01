import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'
import type { Bingo } from '@/payload-types'

/**
 * POST /api/client/bingo/ready — Toggle ready status.
 * Header: Authorization: Bearer <clientToken>
 * Body: { gameId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user, payload } = auth

    const { gameId } = (await req.json()) as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Find player in game
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

    // Toggle ready
    const player = game.teams[playerTeamIndex].players![playerIndex]
    player.isReady = !player.isReady

    // Check if all ready
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

    let newGameStatus: Bingo['gameStatus'] = game.gameStatus
    if (allReady && totalPlayers >= 1) {
      let canStart = true
      for (const team of game.teams) {
        if (game.mode === 'team' && (team.players ?? []).length < 1) {
          canStart = false
          break
        }
        team.teamStatus = 'ready'
      }
      if (canStart) newGameStatus = 'ready'
    } else if (game.gameStatus === 'ready') {
      newGameStatus = 'waiting'
      for (const team of game.teams) {
        team.teamStatus = 'not_ready'
      }
    }

    await payload.update({
      collection: 'bingo',
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
    console.error('[API] Client bingo ready error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to toggle ready' },
      { status: 500 },
    )
  }
}
