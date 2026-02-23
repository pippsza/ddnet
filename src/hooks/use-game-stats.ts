import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface BingoGameEntry {
  id: string
  title: string
  mode: 'solo' | 'team'
  category: string
  gridSize: string
  winCondition: string
  gameStatus: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'
  isPublic: boolean
  isWinner: boolean | null
  createdBy: { id: string; username: string } | null
  players: number
  maxPlayers: number
  createdAt: string
  completedAt: string | null
  duration: number | null
}

export interface RaceGameEntry {
  id: string
  title: string
  category: string
  totalRounds: number
  currentRound: number
  status: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'
  isPublic: boolean
  winner: { id: string; ingameNick?: string } | string | null
  players: Array<{
    user: { id: string; ingameNick?: string } | string
    ingameNick: string
    roundsWon: number
    isReady: boolean
  }>
  rounds: Array<{
    roundNumber: number
    mapName: string
    winner: { id: string } | string | null
    finishTime: number
    completedAt: string
  }> | null
  createdAt: string
  completedAt: string | null
  server: { ip: string; port: number; name?: string }
}

export interface GameHistoryItem {
  type: 'bingo' | 'race'
  id: string
  title: string
  category: string
  status: string
  isWinner: boolean | null
  completedAt: string | null
  createdAt: string
}

export interface MonthlyGameData {
  month: string
  wins: number
  losses: number
  total: number
}

export function useGameStats(userId?: string) {
  const { data: bingoData } = useSWR<{ games: BingoGameEntry[] }>(
    userId ? '/api/bingo/my-games' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  )
  const { data: raceData } = useSWR<{ races: RaceGameEntry[] }>(
    userId ? '/api/race/my-races' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  )

  const bingoGames = bingoData?.games || []
  const raceGames = raceData?.races || []

  // Completed games
  const completedBingo = bingoGames.filter((g) => g.gameStatus === 'completed')
  const completedRaces = raceGames.filter((g) => g.status === 'completed')

  // Win/loss for races
  const raceResults = completedRaces.map((race) => {
    const winnerId = typeof race.winner === 'object' ? race.winner?.id : race.winner
    const isWinner = winnerId === userId
    return { ...race, isWinner }
  })

  // Combined stats
  const bingoWins = completedBingo.filter((g) => g.isWinner === true).length
  const bingoLosses = completedBingo.filter((g) => g.isWinner === false).length
  const raceWins = raceResults.filter((r) => r.isWinner).length
  const raceLosses = raceResults.filter((r) => !r.isWinner).length

  const totalWins = bingoWins + raceWins
  const totalLosses = bingoLosses + raceLosses
  const totalGames = totalWins + totalLosses
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

  // Combined history sorted by date
  const history: GameHistoryItem[] = [
    ...bingoGames.map((g) => ({
      type: 'bingo' as const,
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.gameStatus,
      isWinner: g.isWinner,
      completedAt: g.completedAt,
      createdAt: g.createdAt,
    })),
    ...raceGames.map((r) => {
      const winnerId = typeof r.winner === 'object' ? r.winner?.id : r.winner
      return {
        type: 'race' as const,
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        isWinner: r.status === 'completed' ? winnerId === userId : null,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Monthly game data for charts (last 12 months)
  const monthlyData: MonthlyGameData[] = (() => {
    const months: Record<string, MonthlyGameData> = {}
    const completedAll = [
      ...completedBingo.map((g) => ({
        date: g.completedAt || g.createdAt,
        isWinner: g.isWinner,
      })),
      ...raceResults.map((r) => ({
        date: r.completedAt || r.createdAt,
        isWinner: r.isWinner,
      })),
    ]

    for (const game of completedAll) {
      const d = new Date(game.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) {
        months[key] = {
          month: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          wins: 0,
          losses: 0,
          total: 0,
        }
      }
      months[key].total++
      if (game.isWinner) months[key].wins++
      else months[key].losses++
    }

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v)
  })()

  // Race-specific stats
  const totalRoundsWon = raceGames.reduce((sum, r) => {
    const player = r.players?.find((p) => {
      const pId = typeof p.user === 'object' ? p.user?.id : p.user
      return pId === userId
    })
    return sum + (player?.roundsWon || 0)
  }, 0)

  const totalRoundsPlayed = raceGames.reduce(
    (sum, r) => sum + (r.rounds?.length || 0),
    0,
  )

  // Per-category bingo performance
  const categoryStats: Record<string, { wins: number; losses: number; total: number }> = {}
  for (const g of completedBingo) {
    if (!categoryStats[g.category]) categoryStats[g.category] = { wins: 0, losses: 0, total: 0 }
    categoryStats[g.category].total++
    if (g.isWinner) categoryStats[g.category].wins++
    else categoryStats[g.category].losses++
  }

  return {
    bingoGames,
    raceGames,
    completedBingo,
    completedRaces: raceResults,
    history,
    monthlyData,
    categoryStats,
    stats: {
      totalGames,
      totalWins,
      totalLosses,
      winRate,
      bingoWins,
      bingoLosses,
      bingoTotal: completedBingo.length,
      raceWins,
      raceLosses,
      raceTotal: completedRaces.length,
      totalRoundsWon,
      totalRoundsPlayed,
      activeBingo: bingoGames.filter((g) => ['waiting', 'ready', 'in_progress'].includes(g.gameStatus)).length,
      activeRaces: raceGames.filter((g) => ['waiting', 'ready', 'in_progress'].includes(g.status)).length,
    },
    isLoading: !bingoData || !raceData,
  }
}
