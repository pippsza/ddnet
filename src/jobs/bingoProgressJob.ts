import { getPayload } from 'payload'
import config from '@/payload.config'
import { Player } from 'ddnet'
import { checkWinner } from '@/services/bingo/winChecker'
import type { Bingo, User } from '@/payload-types'

const POLL_INTERVAL = parseInt(process.env.BINGO_POLL_INTERVAL_MS || '5000')

/**
 * Check a single bingo game progress
 * Called periodically for each active game
 */
export async function checkBingoProgress(gameId: string) {
  const payload = await getPayload({ config })

  try {
    // Get game data with populated relationships
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game || game.gameStatus !== 'in_progress') {
      return { continue: false, reason: 'Game not in progress' }
    }

    const startTime = new Date(game.startedAt || '')
    const mapNames = game.maps.map((m) => m.mapName)

    // Create map position lookup
    const mapPositions = new Map<string, number>()
    game.maps.forEach((m) => mapPositions.set(m.mapName.toLowerCase(), m.position))

    let updated = false

    // Check each team
    for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
      const team = game.teams[teamIndex]
      const completedPositions = new Set((team.completedCells || []).map((c) => c.cellPosition))

      // Check each player in team
      for (const playerObj of team.players) {
        const playerUser = typeof playerObj.user === 'object' ? playerObj.user : null
        if (!playerUser) continue

        const playerName = playerUser.username

        try {
          // Fetch player data from DDNet
          const ddnetPlayer = await Player.new(playerName)

          if (!ddnetPlayer || !ddnetPlayer.finishes) {
            continue
          }

          // Check recent finishes (after game start)
          // ddnetPlayer.finishes is an object with 'recent' array
          const allFinishes = ddnetPlayer.finishes.recent || []

          for (const finish of allFinishes) {
            const finishTime = new Date(finish.timestamp)

            // Only count finishes AFTER game started
            if (finishTime < startTime) {
              continue
            }

            // Check if this map is in the grid
            const mapNameLower = finish.mapName.toLowerCase()
            const position = mapPositions.get(mapNameLower)

            if (position !== undefined && !completedPositions.has(position)) {
              // New cell completed!
              completedPositions.add(position)

              if (!team.completedCells) {
                team.completedCells = []
              }

              team.completedCells.push({
                cellPosition: position,
                completedAt: new Date(finish.timestamp).toISOString(),
              })
              updated = true

              console.log(
                `[Bingo] ${playerName} completed cell ${position} (${finish.mapName}) in game ${gameId}`,
              )
            }
          }
        } catch (error) {
          console.error(`[Bingo] Error checking player ${playerName}:`, error)
        }
      }
    }

    // If updated, save and check for winner
    if (updated) {
      // Check for winner
      const teamCells = game.teams.map((team, index) => ({
        teamIndex: index,
        completedCells: (team.completedCells || []).map((c) => c.cellPosition),
      }))

      const winResult = checkWinner(game.gridSize, game.winCondition, teamCells)

      if (winResult.hasWinner) {
        // Update winner and game status
        const winningTeam = game.teams[winResult.winningTeamIndex!]
        winningTeam.teamStatus = 'winner'

        // Set losing team status for team mode
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

        // Update player statistics
        await updatePlayerStats(gameId, game)

        return { continue: false, reason: 'Game completed' }
      } else {
        // Save progress
        await payload.update({
          collection: 'bingo',
          id: gameId,
          data: {
            teams: game.teams,
          },
        })
      }
    }

    return { continue: true, updated }
  } catch (error) {
    console.error(`[Bingo] Error checking progress for game ${gameId}:`, error)
    return { continue: true, error }
  }
}

/**
 * Update player statistics after game completion
 */
async function updatePlayerStats(gameId: string, game: Bingo) {
  const payload = await getPayload({ config })

  const categoryKey = game.mode === 'solo' ? 'solo' : 'team'

  for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
    const team = game.teams[teamIndex]
    const won = team.teamStatus === 'winner'

    for (const playerObj of team.players) {
      try {
        const userId = typeof playerObj.user === 'string' ? playerObj.user : playerObj.user.id
        const user = await payload.findByID({
          collection: 'users',
          id: userId,
        })

        if (!user || !user.bingo) continue

        // Get category-specific stats path
        const categoryPath = game.category.replace(/_/g, '')
        const modePath = game.mode === 'solo' ? 'solo' : 'team'

        // Access nested stats safely
        const categoryStats = (user.bingo as any)?.[categoryPath]?.[modePath] || {}

        await payload.update({
          collection: 'users',
          id: userId,
          data: {
            [`bingo.${categoryPath}.${modePath}.gamesPlayed`]: (categoryStats.gamesPlayed || 0) + 1,
            [`bingo.${categoryPath}.${modePath}.gamesWon`]: won
              ? (categoryStats.gamesWon || 0) + 1
              : categoryStats.gamesWon || 0,
            [`bingo.${categoryPath}.${modePath}.gamesLost`]: !won
              ? (categoryStats.gamesLost || 0) + 1
              : categoryStats.gamesLost || 0,
            [`bingo.${categoryPath}.${modePath}.totalMapsCompleted`]:
              (categoryStats.totalMapsCompleted || 0) + (team.completedCells?.length || 0),
          },
        })

        console.log(`[Bingo] Updated stats for user ${userId}`)
      } catch (error) {
        console.error(`[Bingo] Error updating stats for player:`, error)
      }
    }
  }
}

/**
 * Main job runner - checks all active games
 * Should be called periodically (e.g., every 5 seconds)
 */
export async function runBingoProgressJob() {
  const payload = await getPayload({ config })

  try {
    // Find all games in progress
    const { docs: activeGames } = await payload.find({
      collection: 'bingo',
      where: {
        gameStatus: {
          equals: 'in_progress',
        },
      },
      limit: 100,
    })

    console.log(`[Bingo Job] Checking ${activeGames.length} active games`)

    // Check each game
    for (const game of activeGames) {
      await checkBingoProgress(game.id)
    }
  } catch (error) {
    console.error('[Bingo Job] Error running progress job:', error)
  }
}

/**
 * Start polling job (for development/standalone mode)
 */
export function startBingoProgressJob() {
  console.log(`[Bingo Job] Starting with interval ${POLL_INTERVAL}ms`)

  setInterval(() => {
    runBingoProgressJob()
  }, POLL_INTERVAL)

  // Run immediately
  runBingoProgressJob()
}
