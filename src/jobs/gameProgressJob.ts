import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkWinner } from '@/services/bingo/winChecker'
import { findPlayersOnline, type PlayerOnlineStatus } from '@/lib/ddnet-helpers'
import type { Bingo, Race, User } from '@/payload-types'

const POLL_INTERVAL = parseInt(process.env.GAME_POLL_INTERVAL_MS || '5000')

// Server presence tracking: gameId → playerName(lowercase) → lastSeenTimestamp(ms)
const serverPresence = new Map<string, Map<string, number>>()
const SERVER_PRESENCE_WINDOW = 60_000 // 60 seconds

/**
 * Check if a player's online status matches the game's registered server.
 * Compares by server name (primary) or IP+port (fallback).
 */
function isOnGameServer(
  playerStatus: PlayerOnlineStatus,
  gameServer: { ip?: string | null; port?: number | null; name?: string | null },
): boolean {
  if (!playerStatus.online || !playerStatus.server) return false
  // Primary: match server name (most reliable, handles IP format differences)
  if (gameServer.name && playerStatus.server.name) {
    return playerStatus.server.name.toLowerCase() === gameServer.name.toLowerCase()
  }
  // Fallback: match IP + port
  if (gameServer.ip && playerStatus.server.ip) {
    return (
      playerStatus.server.ip === gameServer.ip &&
      (playerStatus.server.port || 8303) === (gameServer.port || 8303)
    )
  }
  return false
}

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
    console.error(`[GameJob] Failed to fetch DDNet data for ${playerName}:`, error)
    return []
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// =============================================================================
// Bingo progress (unchanged logic)
// =============================================================================

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

      const teamPlayers = team.players ?? []
      // Track which players finished each map position: position → Set of player IDs
      const positionFinishes = new Map<number, Map<string, number>>() // position → (playerId → finishTimestamp)

      for (const playerObj of teamPlayers) {
        const playerUser = typeof playerObj.user === 'object' ? playerObj.user : null
        if (!playerUser) continue

        const playerName = playerUser.ingameNick || playerUser.username
        const playerId = playerUser.id

        try {
          const finishes = await fetchPlayerFinishes(playerName)

          for (const finish of finishes) {
            const finishTimestamp = finish.timestamp * 1000

            if (finishTimestamp < startTimestamp) {
              continue
            }

            const mapNameLower = finish.map.toLowerCase()
            const position = mapPositions.get(mapNameLower)

            if (position !== undefined && !completedPositions.has(position)) {
              if (!positionFinishes.has(position)) {
                positionFinishes.set(position, new Map())
              }
              const playerMap = positionFinishes.get(position)!
              // Keep the earliest finish per player
              if (!playerMap.has(playerId)) {
                playerMap.set(playerId, finishTimestamp)
              }

              console.log(
                `[Bingo] ${playerName} finished cell ${position} (${finish.map}) in game ${gameId}`,
              )
            }
          }

          await sleep(200)
        } catch (error) {
          console.error(`[Bingo] Error checking player ${playerName}:`, error)
        }
      }

      // Now check which cells ALL team players have completed
      const totalPlayers = teamPlayers.filter(
        (p) => typeof p.user === 'object' && p.user !== null,
      ).length

      for (const [position, playerMap] of positionFinishes) {
        if (playerMap.size >= totalPlayers) {
          // All players finished this map — mark cell complete
          const latestFinish = Math.max(...playerMap.values())

          if (!team.completedCells) {
            team.completedCells = []
          }

          team.completedCells.push({
            cellPosition: position,
            completedAt: new Date(latestFinish).toISOString(),
          })
          updated = true

          console.log(
            `[Bingo] All ${totalPlayers} players completed cell ${position} in game ${gameId}`,
          )
        } else {
          console.log(
            `[Bingo] Cell ${position}: ${playerMap.size}/${totalPlayers} players finished in game ${gameId}`,
          )
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
        await updateBingoPlayerStats(game)

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

async function updateBingoPlayerStats(game: Bingo) {
  const payload = await getPayload({ config })

  for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
    const team = game.teams[teamIndex]
    const won = team.teamStatus === 'winner'

    for (const playerObj of team.players ?? []) {
      try {
        const userId = typeof playerObj.user === 'string' ? playerObj.user : playerObj.user.id
        const user = await payload.findByID({ collection: 'users', id: userId })

        if (!user || !user.bingo) continue

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

// =============================================================================
// Race progress
// =============================================================================

/**
 * Check a single race game progress.
 * Polls DDNet API for player finishes, scores the earliest finisher per step.
 */
export async function checkRaceProgress(gameId: string) {
  const payload = await getPayload({ config })

  try {
    const game = await payload.findByID({
      collection: 'races',
      id: gameId,
      depth: 2,
    }) as Race | null

    if (!game || game.gameStatus !== 'in_progress') {
      return { continue: false, reason: 'Race not in progress' }
    }

    const currentStep = game.currentStep ?? 0
    const startTimestamp = game.startedAt ? new Date(game.startedAt).getTime() : 0
    if (!startTimestamp) {
      console.log(`[Race] Game ${gameId}: no startedAt, skipping`)
      return { continue: true }
    }

    // --- Server presence check via Master Server ---
    // Collect all player names and check who is on the game server
    const allPlayerNames: string[] = []
    for (const team of game.teams) {
      for (const playerObj of team.players ?? []) {
        const pu = typeof playerObj.user === 'object' ? playerObj.user : null
        if (pu) {
          const name = (pu as User).ingameNick || (pu as User).username
          if (name) allPlayerNames.push(name)
        }
      }
    }

    if (!serverPresence.has(gameId)) {
      serverPresence.set(gameId, new Map())
    }
    const presenceMap = serverPresence.get(gameId)!

    try {
      const onlineStatuses = await findPlayersOnline(allPlayerNames)
      for (const status of onlineStatuses) {
        if (isOnGameServer(status, game.server || {})) {
          presenceMap.set(status.name.toLowerCase(), Date.now())
        }
      }
    } catch (err) {
      console.error(`[Race] Failed to check Master Server for game ${gameId}:`, err)
    }

    // Determine which map to check for this step
    const currentMapEntry = (game.maps || []).find((m) => m.position === currentStep)
    const isFreeModeWithoutMap = game.categoryMode === 'free' && !currentMapEntry

    console.log(
      `[Race] Game ${gameId}: step=${currentStep}, mode=${game.categoryMode}, ` +
      `map=${currentMapEntry?.mapName || '(none)'}, startedAt=${game.startedAt}`,
    )

    // For selected mode: must have a map defined for the current step
    if (game.categoryMode === 'selected' && !currentMapEntry) {
      console.log(`[Race] Game ${gameId}: no map for step ${currentStep} in selected mode, skipping`)
      return { continue: true }
    }

    // Build set of already-scored map names (for free mode dedup)
    const scoredMaps = new Set<string>()
    for (const team of game.teams) {
      for (const step of team.completedSteps ?? []) {
        const mapEntry = (game.maps || []).find((m) => m.position === step.position)
        if (mapEntry) scoredMaps.add(mapEntry.mapName.toLowerCase())
      }
    }

    // Determine the earliest time from which to check finishes:
    // For step 0: game start time. For step N: completion time of step N-1.
    let checkFromTimestamp = startTimestamp
    for (const team of game.teams) {
      for (const step of team.completedSteps ?? []) {
        if (step.position === currentStep - 1 && step.completedAt) {
          const t = new Date(step.completedAt).getTime()
          if (t > checkFromTimestamp) checkFromTimestamp = t
        }
      }
    }

    // Phase 1: Fetch all players' finishes (respecting server presence)
    interface PlayerFinishData {
      teamIndex: number
      playerName: string
      finishes: DDNetFinish[]
    }
    const playerFinishData: PlayerFinishData[] = []

    for (let ti = 0; ti < game.teams.length; ti++) {
      const team = game.teams[ti]

      for (const playerObj of team.players ?? []) {
        const playerUser = typeof playerObj.user === 'object' ? playerObj.user : null
        if (!playerUser) continue

        const playerName = (playerUser as User).ingameNick || (playerUser as User).username
        if (!playerName) continue

        // Check server presence: was this player on the game server recently?
        const lastSeen = presenceMap.get(playerName.toLowerCase()) ?? 0
        const wasOnServer = (Date.now() - lastSeen) < SERVER_PRESENCE_WINDOW

        if (!wasOnServer) {
          console.log(`[Race] ${playerName} not on game server, skipping finish check`)
          continue
        }

        try {
          const finishes = await fetchPlayerFinishes(playerName)
          playerFinishData.push({ teamIndex: ti, playerName, finishes })
          await sleep(200)
        } catch (error) {
          console.error(`[Race] Error checking player ${playerName}:`, error)
        }
      }
    }

    // Phase 2: For free mode, build set of ALL maps finished by ANY player
    // in PREVIOUS steps (game start to current step start) to prevent reuse
    const prevFinishedMaps = new Set<string>(scoredMaps)
    if (isFreeModeWithoutMap) {
      for (const { finishes } of playerFinishData) {
        for (const f of finishes) {
          const ft = f.timestamp * 1000
          if (ft >= startTimestamp && ft < checkFromTimestamp) {
            prevFinishedMaps.add(f.map.toLowerCase())
          }
        }
      }
    }

    // Phase 3: Evaluate candidates for current step — find earliest valid finish
    interface FinishCandidate {
      teamIndex: number
      playerName: string
      finishTime: number    // DDNet finish time (seconds)
      timestamp: number     // DDNet Unix timestamp (ms)
      mapName: string       // Map that was finished
    }

    let earliest: FinishCandidate | null = null

    for (const { teamIndex: ti, playerName, finishes } of playerFinishData) {
      // Log recent finishes for debugging
      const recentFinishes = finishes
        .filter((f) => f.timestamp * 1000 >= checkFromTimestamp)
        .slice(0, 5)
      if (recentFinishes.length > 0) {
        console.log(
          `[Race] ${playerName}: ${recentFinishes.length} finishes since ${new Date(checkFromTimestamp).toISOString()}: ` +
          recentFinishes.map((f) => `${f.map}@${new Date(f.timestamp * 1000).toISOString()}`).join(', '),
        )
      }

      for (const finish of finishes) {
        const finishTimestamp = finish.timestamp * 1000

        if (finishTimestamp < checkFromTimestamp) continue

        const mapLower = finish.map.toLowerCase()

        let isValidFinish = false

        if (isFreeModeWithoutMap) {
          // Free mode: map must not have been finished by any player in previous steps
          if (!prevFinishedMaps.has(mapLower)) {
            isValidFinish = true
          }
        } else if (currentMapEntry) {
          // Selected mode (or free mode with known map): must match current step's map
          if (mapLower === currentMapEntry.mapName.toLowerCase()) {
            isValidFinish = true
          }
        }

        if (isValidFinish) {
          if (!earliest || finishTimestamp < earliest.timestamp) {
            earliest = {
              teamIndex: ti,
              playerName,
              finishTime: finish.time,
              timestamp: finishTimestamp,
              mapName: finish.map,
            }
          }
        }
      }
    }

    if (!earliest) return { continue: true }

    // Score the earliest finish
    console.log(
      `[Race] ${earliest.playerName} (team ${earliest.teamIndex}) completed step ${currentStep} ` +
      `(${earliest.mapName}) in ${earliest.finishTime.toFixed(2)}s — game ${gameId}`,
    )

    const teams = JSON.parse(JSON.stringify(game.teams))
    const scoringTeam = teams[earliest.teamIndex]

    if (!scoringTeam.completedSteps) scoringTeam.completedSteps = []
    scoringTeam.completedSteps.push({
      position: currentStep,
      completedAt: new Date(earliest.timestamp).toISOString(),
      finishTime: earliest.finishTime,
    })
    scoringTeam.score = (scoringTeam.score || 0) + 1

    // For free mode: add map to the maps array if not already present
    const maps = [...(game.maps || [])]
    if (isFreeModeWithoutMap) {
      maps.push({ mapName: earliest.mapName, position: currentStep })
    }

    const nextStep = currentStep + 1
    const isComplete = nextStep >= game.pathLength

    const updateData: Record<string, any> = {
      teams,
      maps,
      currentStep: nextStep,
    }

    if (isComplete) {
      // Determine winner: most points, tie-break by total finish time
      let maxScore = -1
      let winnerIdx: number | null = null
      let winnerTotalTime = Infinity

      for (let i = 0; i < teams.length; i++) {
        const score = teams[i].score || 0
        const totalTime = (teams[i].completedSteps ?? []).reduce(
          (sum: number, s: any) => sum + (s.finishTime || 0),
          0,
        )

        if (
          score > maxScore ||
          (score === maxScore && totalTime < winnerTotalTime)
        ) {
          maxScore = score
          winnerIdx = i
          winnerTotalTime = totalTime
        }
      }

      // Check for a true tie
      const isTie = teams.filter((t: any) => (t.score || 0) === maxScore).length > 1
        && teams.filter((t: any) => {
          const tt = (t.completedSteps ?? []).reduce(
            (s: number, step: any) => s + (step.finishTime || 0), 0,
          )
          return (t.score || 0) === maxScore && tt === winnerTotalTime
        }).length > 1

      // Update team statuses
      if (isTie) {
        for (let i = 0; i < teams.length; i++) {
          teams[i].teamStatus = (teams[i].score || 0) === maxScore ? 'winner' : 'loser'
        }
      } else {
        for (let i = 0; i < teams.length; i++) {
          teams[i].teamStatus = i === winnerIdx ? 'winner' : 'loser'
        }
      }

      const startTime = game.startedAt ? new Date(game.startedAt).getTime() : Date.now()
      const duration = Math.floor((Date.now() - startTime) / 1000)

      updateData.gameStatus = 'completed'
      updateData.winnerTeam = winnerIdx
      updateData.completedAt = new Date().toISOString()
      updateData.duration = duration
      updateData.teams = teams

      console.log(`[Race] Game ${gameId} completed! Winner: Team ${winnerIdx}`)
    }

    await payload.update({ collection: 'races', id: gameId, data: updateData })

    if (isComplete) {
      serverPresence.delete(gameId)
      await updateRacePlayerStats(game, teams)
    }

    return { continue: !isComplete, updated: true }
  } catch (error) {
    console.error(`[Race] Error checking progress for game ${gameId}:`, error)
    return { continue: true, error }
  }
}

/**
 * Update race player stats after game completion.
 * Updates per-category stats, global totals, and clears activeGame.
 */
async function updateRacePlayerStats(game: Race, finalTeams: any[]) {
  const payload = await getPayload({ config })

  // Map game category to raceStats field path
  const category = game.category.toLowerCase()

  for (let ti = 0; ti < finalTeams.length; ti++) {
    const team = finalTeams[ti]
    const won = team.teamStatus === 'winner'
    const lost = team.teamStatus === 'loser'

    // Count how many steps this team completed
    const teamRoundsWon = (team.completedSteps ?? []).length
    const teamFinishTimes = (team.completedSteps ?? [])
      .map((s: any) => s.finishTime)
      .filter((t: number | null | undefined): t is number => t != null && t > 0)

    for (const playerObj of team.players ?? []) {
      try {
        const userId = typeof playerObj.user === 'string' ? playerObj.user : playerObj.user.id
        const user = await payload.findByID({ collection: 'users', id: userId })
        if (!user) continue

        const existingCompleted = (user.completedGames as any[]) || []
        const completedGames = [
          ...existingCompleted,
          { relationTo: 'races', value: game.id },
        ]

        // Build per-category stats update
        const existingRaceStats = (user.raceStats ?? {}) as any
        const catStats = getCategoryStats(existingRaceStats, category)

        const newGamesPlayed = (catStats.gamesPlayed || 0) + 1
        const newGamesWon = (catStats.gamesWon || 0) + (won ? 1 : 0)
        const newGamesLost = (catStats.gamesLost || 0) + (lost ? 1 : 0)
        const newRoundsWon = (catStats.totalRoundsWon || 0) + teamRoundsWon

        // Best finish time: smallest time across all team finishes
        const bestTeamTime = teamFinishTimes.length > 0 ? Math.min(...teamFinishTimes) : null
        const newBestTime = bestTeamTime != null
          ? (catStats.bestFinishTime != null
            ? Math.min(catStats.bestFinishTime, bestTeamTime)
            : bestTeamTime)
          : catStats.bestFinishTime

        // Average finish time: rolling average
        const oldAvg = catStats.averageFinishTime || 0
        const oldRounds = (catStats.totalRoundsWon || 0)
        const newAvg = teamFinishTimes.length > 0
          ? ((oldAvg * oldRounds) + teamFinishTimes.reduce((a: number, b: number) => a + b, 0)) /
            (oldRounds + teamFinishTimes.length)
          : oldAvg

        const updatedCatStats = {
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          gamesLost: newGamesLost,
          totalRoundsWon: newRoundsWon,
          bestFinishTime: newBestTime,
          averageFinishTime: Math.round(newAvg * 100) / 100,
        }

        // Apply updated category stats
        const newRaceStats = { ...existingRaceStats }
        setCategoryStats(newRaceStats, category, updatedCatStats)

        // Update global totals
        const totalPlayed = (existingRaceStats.totalRacesPlayed || 0) + 1
        const totalWon = (existingRaceStats.totalRacesWon || 0) + (won ? 1 : 0)
        newRaceStats.totalRacesPlayed = totalPlayed
        newRaceStats.totalRacesWon = totalWon
        newRaceStats.winRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0

        await payload.update({
          collection: 'users',
          id: userId,
          overrideAccess: true,
          data: {
            activeGame: null,
            completedGames,
            raceStats: newRaceStats,
          },
        })
      } catch (error) {
        console.error(`[Race] Error updating stats for player:`, error)
      }
    }
  }
}

/**
 * Get category stats from the nested raceStats object.
 * Handles both flat categories (novice, moderate) and ddmax subcategories (ddmax_easy, etc.)
 */
function getCategoryStats(raceStats: any, category: string): any {
  // Check for ddmax subcategories (e.g., "ddmax_easy" → raceStats.ddmax.easy)
  if (category.startsWith('ddmax_')) {
    const sub = category.replace('ddmax_', '')
    return raceStats?.ddmax?.[sub] ?? {}
  }
  return raceStats?.[category] ?? {}
}

function setCategoryStats(raceStats: any, category: string, stats: any): void {
  if (category.startsWith('ddmax_')) {
    const sub = category.replace('ddmax_', '')
    if (!raceStats.ddmax) raceStats.ddmax = {}
    raceStats.ddmax[sub] = stats
  } else {
    raceStats[category] = stats
  }
}

// =============================================================================
// Shared job runner
// =============================================================================

export async function runGameProgressJob() {
  const payload = await getPayload({ config })

  try {
    // Check bingo games
    const { docs: activeBingo } = await payload.find({
      collection: 'bingo',
      where: { gameStatus: { equals: 'in_progress' } },
      limit: 100,
    })

    if (activeBingo.length > 0) {
      console.log(`[GameJob] Checking ${activeBingo.length} active bingo games`)
      for (const game of activeBingo) {
        await checkBingoProgress(game.id)
      }
    }

    // Check race games
    const { docs: activeRaces } = await payload.find({
      collection: 'races',
      where: { gameStatus: { equals: 'in_progress' } },
      limit: 100,
    })

    if (activeRaces.length > 0) {
      console.log(`[GameJob] Checking ${activeRaces.length} active race games`)
      for (const game of activeRaces) {
        await checkRaceProgress(game.id)
      }
    }
  } catch (error) {
    console.error('[GameJob] Error running progress job:', error)
  }
}

export function startGameProgressJob() {
  console.log(`[GameJob] Starting with interval ${POLL_INTERVAL}ms`)
  setInterval(() => { runGameProgressJob() }, POLL_INTERVAL)
  runGameProgressJob()
}
