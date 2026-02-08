import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    // Verify bot secret
    const botSecret = req.headers.get('X-Bot-Secret')
    if (botSecret !== process.env.BACKEND_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { raceId, playerName, finishTime, timestamp } = await req.json()

    if (!raceId || !playerName || finishTime === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
      depth: 2,
    })

    if (!race || race.status !== 'in_progress') {
      return NextResponse.json({ error: 'Invalid or inactive race' }, { status: 400 })
    }

    // Find the player in the race
    const playerIndex = race.players.findIndex(
      (p) => p.ingameNick.toLowerCase() === playerName.toLowerCase(),
    )

    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Player not in race' }, { status: 400 })
    }

    // Check if current round already has a winner
    const currentRound = race.rounds?.find((r) => r.roundNumber === race.currentRound)
    if (currentRound?.winner) {
      return NextResponse.json({ error: 'Round already completed' }, { status: 400 })
    }

    const player = race.players[playerIndex]
    const playerId = typeof player.user === 'string' ? player.user : player.user.id

    // Update rounds history
    const rounds = [...(race.rounds || [])]
    const existingRoundIndex = rounds.findIndex((r) => r.roundNumber === race.currentRound)

    const roundData = {
      roundNumber: race.currentRound || 0,
      mapName: race.currentMap || 'Unknown',
      winner: playerId,
      finishTime,
      completedAt: timestamp || new Date().toISOString(),
    }

    if (existingRoundIndex >= 0) {
      rounds[existingRoundIndex] = roundData
    } else {
      rounds.push(roundData)
    }

    // Update player's rounds won
    const players = [...race.players]
    players[playerIndex] = {
      ...players[playerIndex],
      roundsWon: (players[playerIndex].roundsWon || 0) + 1,
    }

    // Check if race is complete
    const roundsWon = players[playerIndex].roundsWon!
    const isComplete = roundsWon >= race.totalRounds

    const updateData: Record<string, unknown> = {
      rounds,
      players,
      currentRound: (race.currentRound || 0) + 1,
    }

    if (isComplete) {
      updateData.status = 'completed'
      updateData.winner = playerId
      updateData.completedAt = new Date().toISOString()
    }

    await payload.update({
      collection: 'races',
      id: raceId,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      roundWinner: playerName,
      raceComplete: isComplete,
    })
  } catch (error: unknown) {
    console.error('[API] Error processing race finish:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process finish' },
      { status: 500 },
    )
  }
}
