import { NextRequest, NextResponse } from 'next/server'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

/** Categories that have direct fields on user.raceStats */
const RACE_STAT_CATEGORIES = new Set([
  'novice', 'moderate', 'brutal', 'insane', 'dummy', 'oldschool', 'solo_maps', 'race',
])

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

    // Update player stats when race completes (fire-and-forget)
    if (isComplete) {
      updateRacePlayerStats(payload, {
        id: raceId,
        category: race.category,
        players,
        rounds,
      }, playerId).catch((err) => {
        console.error('[Race] Error updating player stats:', err)
      })
    }

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

async function updateRacePlayerStats(
  payload: Payload,
  race: { id: string; category: string; players: any[]; rounds: any[] },
  winnerId: string,
) {
  const category = race.category

  for (const player of race.players) {
    try {
      const userId = typeof player.user === 'string' ? player.user : player.user.id
      const user = await payload.findByID({ collection: 'users', id: userId })
      if (!user) continue

      const isWinner = userId === winnerId
      const playerRoundsWon = player.roundsWon || 0

      // Append to completedGames
      const existingCompleted = (user.completedGames as any[]) || []
      const completedGames = [
        ...existingCompleted,
        { relationTo: 'races', value: race.id },
      ]

      // Global stats
      const stats = (user.raceStats as any) || {}
      const totalPlayed = (stats.totalRacesPlayed || 0) + 1
      const totalWon = (stats.totalRacesWon || 0) + (isWinner ? 1 : 0)

      const raceStatsUpdate: Record<string, any> = {
        ...stats,
        totalRacesPlayed: totalPlayed,
        totalRacesWon: totalWon,
        winRate: Math.round((totalWon / totalPlayed) * 100),
      }

      // Per-category stats (standard non-ddmax categories only)
      if (RACE_STAT_CATEGORIES.has(category)) {
        const catStats = stats[category] || {}
        const catPlayed = (catStats.gamesPlayed || 0) + 1
        const catWon = (catStats.gamesWon || 0) + (isWinner ? 1 : 0)
        const catLost = (catStats.gamesLost || 0) + (isWinner ? 0 : 1)
        const catRoundsWon = (catStats.totalRoundsWon || 0) + playerRoundsWon

        // Compute best finish time from this player's round wins
        const playerWonRounds = race.rounds.filter((r: any) => {
          const rw = typeof r.winner === 'string' ? r.winner : r.winner?.id
          return rw === userId
        })
        const finishTimes = playerWonRounds
          .map((r: any) => r.finishTime)
          .filter((t: any) => typeof t === 'number' && t > 0)

        let bestTime = catStats.bestFinishTime
        if (finishTimes.length > 0) {
          const minTime = Math.min(...finishTimes)
          if (!bestTime || minTime < bestTime) {
            bestTime = minTime
          }
        }

        // Rolling average finish time
        let avgTime = catStats.averageFinishTime || 0
        if (finishTimes.length > 0) {
          const prevRoundsWon = catStats.totalRoundsWon || 0
          const prevTotal = avgTime * prevRoundsWon
          const newTotal = prevTotal + finishTimes.reduce((a: number, b: number) => a + b, 0)
          avgTime = catRoundsWon > 0 ? Math.round((newTotal / catRoundsWon) * 100) / 100 : 0
        }

        raceStatsUpdate[category] = {
          gamesPlayed: catPlayed,
          gamesWon: catWon,
          gamesLost: catLost,
          totalRoundsWon: catRoundsWon,
          bestFinishTime: bestTime,
          averageFinishTime: avgTime,
        }

        // Determine favorite category (most played)
        let maxPlayed = 0
        let favCategory = stats.favoriteCategory || category
        for (const cat of RACE_STAT_CATEGORIES) {
          const cp = cat === category ? catPlayed : (stats[cat]?.gamesPlayed || 0)
          if (cp > maxPlayed) {
            maxPlayed = cp
            favCategory = cat
          }
        }
        raceStatsUpdate.favoriteCategory = favCategory
      }

      await payload.update({
        collection: 'users',
        id: userId,
        overrideAccess: true,
        data: {
          activeGame: null,
          completedGames,
          raceStats: raceStatsUpdate,
        },
      })
    } catch (error) {
      console.error(`[Race] Error updating stats for player ${player.ingameNick}:`, error)
    }
  }
}
