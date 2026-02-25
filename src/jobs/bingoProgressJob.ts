import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkWinner } from '@/services/bingo/winChecker'
import type { Bingo } from '@/payload-types'

const POLL_INTERVAL = parseInt(process.env.BINGO_POLL_INTERVAL_MS || '5000')

interface DDNetFinish {
  timestamp: number
  map: string
  time: number
  country: string
  type?: string
}

/**
 * Fetch player finishes directly from DDNet API (bypass ddnet library ZodError)
 * Returns all last_finishes, not just 10 from .finishes.recent
 */
async function fetchPlayerFinishes(playerName: string): Promise<DDNetFinish[]> {
  try {
    const url = `https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []

    const data = await res.json()
    if (!data || !data.player) return []

    return (data.last_finishes || []) as DDNetFinish[]
  } catch (error) {
    console.error(`[Bingo] Failed to fetch DDNet data for ${playerName}:`, error)
    return []
  }
}

/**
 * Check a single bingo game progress
 * Called periodically for each active game
 */
export async function checkBingoProgress(gameId: string) {
  const payload = await getPayload({ config })

  try {
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game || game.gameStatus !== 'in_progress') {
      return { continue: false, reason: 'Game not in progress' }
    }

    const startTime = new Date(game.startedAt || '')
    const startTimestamp = startTime.getTime()

    // Create map position lookup (case-insensitive)
    const mapPositions = new Map<string, number>()
    game.maps.forEach((m) => mapPositions.set(m.mapName.toLowerCase(), m.position))

    let updated = false

    for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
      const team = game.teams[teamIndex]
      const completedPositions = new Set((team.completedCells || []).map((c) => c.cellPosition))

      for (const playerObj of team.players ?? []) {
        const playerUser = typeof playerObj.user === 'object' ? playerObj.user : null
        if (!playerUser) continue

        const playerName = playerUser.username

        try {
          // Fetch directly from DDNet API to avoid ZodError and get ALL finishes
          const finishes = await fetchPlayerFinishes(playerName)

          for (const finish of finishes) {
            // DDNet API returns timestamp as Unix seconds
            const finishTimestamp = finish.timestamp * 1000

            if (finishTimestamp < startTimestamp) {
              continue
            }

            const mapNameLower = finish.map.toLowerCase()
            const position = mapPositions.get(mapNameLower)

            if (position !== undefined && !completedPositions.has(position)) {
              completedPositions.add(position)

              if (!team.completedCells) {
                team.completedCells = []
              }

              team.completedCells.push({
                cellPosition: position,
                completedAt: new Date(finishTimestamp).toISOString(),
              })
              updated = true

              console.log(
                `[Bingo] ${playerName} completed cell ${position} (${finish.map}) in game ${gameId}`,
              )
            }
          }

          // Rate limit between players
          await new Promise((r) => setTimeout(r, 200))
        } catch (error) {
          console.error(`[Bingo] Error checking player ${playerName}:`, error)
        }
      }
    }

    if (updated) {
      const teamCells = game.teams.map((team, index) => ({
        teamIndex: index,
        completedCells: (team.completedCells || []).map((c) => c.cellPosition),
      }))

      const winResult = checkWinner(game.gridSize, game.winCondition, teamCells)

      if (winResult.hasWinner) {
        const winningTeam = game.teams[winResult.winningTeamIndex!]
        winningTeam.teamStatus = 'winner'

        if (game.mode === 'team') {
          const losingTeamIndex = winResult.winningTeamIndex === 0 ? 1 : 0
          game.teams[losingTeamIndex].teamStatus = 'loser'
        }

        await payload.update({
          collection: 'bingo',
          id: gameId,
          data: {
            teams: game.teams,
            gameStatus: 'completed',
            completedAt: new Date().toISOString(),
            winnerTeam: game.mode === 'team' ? winResult.winningTeamIndex : undefined,
          },
        })

        console.log(`[Bingo] Game ${gameId} completed! Winner: Team ${winResult.winningTeamIndex}`)
        await updatePlayerStats(game)

        return { continue: false, reason: 'Game completed' }
      } else {
        await payload.update({
          collection: 'bingo',
          id: gameId,
          data: { teams: game.teams },
        })
      }
    }

    return { continue: true, updated }
  } catch (error) {
    console.error(`[Bingo] Error checking progress for game ${gameId}:`, error)
    return { continue: true, error }
  }
}

async function updatePlayerStats(game: Bingo) {
  const payload = await getPayload({ config })

  for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
    const team = game.teams[teamIndex]
    const won = team.teamStatus === 'winner'

    for (const playerObj of team.players ?? []) {
      try {
        const userId = typeof playerObj.user === 'string' ? playerObj.user : playerObj.user.id
        const user = await payload.findByID({ collection: 'users', id: userId })

        if (!user || !user.bingo) continue

        // Build completed games list (add this game)
        const existingCompleted = (user.completedGames as any[]) || []
        const completedGames = [
          ...existingCompleted,
          { relationTo: 'bingo', value: game.id },
        ]

        await payload.update({
          collection: 'users',
          id: userId,
          overrideAccess: true,
          data: {
            activeGame: null,
            completedGames,
            bingo: {
              ...user.bingo,
              totalGamesPlayed: (user.bingo.totalGamesPlayed || 0) + 1,
              totalGamesWon: won
                ? (user.bingo.totalGamesWon || 0) + 1
                : user.bingo.totalGamesWon || 0,
            },
          },
        })
      } catch (error) {
        console.error(`[Bingo] Error updating stats for player:`, error)
      }
    }
  }
}

export async function runBingoProgressJob() {
  const payload = await getPayload({ config })

  try {
    const { docs: activeGames } = await payload.find({
      collection: 'bingo',
      where: { gameStatus: { equals: 'in_progress' } },
      limit: 100,
    })

    if (activeGames.length === 0) return

    console.log(`[Bingo Job] Checking ${activeGames.length} active games`)

    for (const game of activeGames) {
      await checkBingoProgress(game.id)
    }
  } catch (error) {
    console.error('[Bingo Job] Error running progress job:', error)
  }
}

export function startBingoProgressJob() {
  console.log(`[Bingo Job] Starting with interval ${POLL_INTERVAL}ms`)
  setInterval(() => { runBingoProgressJob() }, POLL_INTERVAL)
  runBingoProgressJob()
}
