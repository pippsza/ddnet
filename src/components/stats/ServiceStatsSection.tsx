'use client'

import { StatCard } from '@/components/stats/StatCard'
import { DualWinRateChart } from '@/components/stats/DualWinRateChart'
import { GamesTimelineChart } from '@/components/stats/GamesTimelineChart'
import { RecentGamesCard } from '@/components/stats/RecentGamesCard'
import { RaceStatsCard } from '@/components/stats/RaceStatsCard'
import { CategoryPerformanceCard } from '@/components/stats/CategoryPerformanceCard'
import type { useGameStats } from '@/hooks/use-game-stats'

type GameStats = ReturnType<typeof useGameStats>

interface ServiceStatsSectionProps {
  gameStats: GameStats
}

export function ServiceStatsSection({ gameStats }: ServiceStatsSectionProps) {
  return (
    <>
      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Games"
          value={gameStats.stats.totalGames}
          subtitle={`${gameStats.stats.activeBingo + gameStats.stats.activeRaces + (gameStats.stats.activeKogBingo ?? 0) + (gameStats.stats.activeKogRaces ?? 0)} active`}
        />
        <StatCard
          title="Overall Win Rate"
          value={`${gameStats.stats.winRate}%`}
          subtitle={`${gameStats.stats.totalWins}W / ${gameStats.stats.totalLosses}L`}
        />
      </div>

      {/* All 4 game modes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="DDNet Bingo"
          value={`${gameStats.stats.bingoWins}W / ${gameStats.stats.bingoLosses}L`}
          subtitle={`${gameStats.stats.bingoTotal} games`}
        />
        <StatCard
          title="DDNet Race"
          value={`${gameStats.stats.raceWins}W / ${gameStats.stats.raceLosses}L`}
          subtitle={`${gameStats.stats.totalRoundsWon} rounds won`}
        />
        <StatCard
          title="KoG Bingo"
          value={`${gameStats.stats.kogBingoWins ?? 0}W / ${gameStats.stats.kogBingoLosses ?? 0}L`}
          subtitle={`${gameStats.stats.kogBingoTotal ?? 0} games`}
        />
        <StatCard
          title="KoG Race"
          value={`${gameStats.stats.kogRaceWins ?? 0}W / ${gameStats.stats.kogRaceLosses ?? 0}L`}
          subtitle={`${gameStats.stats.kogRaceTotal ?? 0} games`}
        />
      </div>

      {/* Win Rate Charts + Games Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DualWinRateChart
          bingoWins={gameStats.stats.bingoWins + (gameStats.stats.kogBingoWins ?? 0)}
          bingoLosses={gameStats.stats.bingoLosses + (gameStats.stats.kogBingoLosses ?? 0)}
          raceWins={gameStats.stats.raceWins + (gameStats.stats.kogRaceWins ?? 0)}
          raceLosses={gameStats.stats.raceLosses + (gameStats.stats.kogRaceLosses ?? 0)}
        />
        <GamesTimelineChart data={gameStats.monthlyData} />
      </div>

      {/* Category Performance + Race Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPerformanceCard categoryStats={gameStats.categoryStats} />
        <RaceStatsCard
          raceWins={gameStats.stats.raceWins}
          raceLosses={gameStats.stats.raceLosses}
          raceTotal={gameStats.stats.raceTotal}
          totalRoundsWon={gameStats.stats.totalRoundsWon}
          totalRoundsPlayed={gameStats.stats.totalRoundsPlayed}
          activeRaces={gameStats.stats.activeRaces}
        />
      </div>

      {/* Recent Games */}
      <RecentGamesCard games={gameStats.history} />
    </>
  )
}
