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

const MODE_COLORS = {
  ddnetBingo: '#3b82f6',   // blue-500
  ddnetRace: '#10b981',    // emerald-500
  kogBingo: '#a855f7',     // purple-500
  kogRace: '#f97316',      // orange-500
} as const

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
          accentColor={MODE_COLORS.ddnetBingo}
        />
        <StatCard
          title="DDNet Race"
          value={`${gameStats.stats.raceWins}W / ${gameStats.stats.raceLosses}L`}
          subtitle={`${gameStats.stats.totalRoundsWon} rounds won`}
          accentColor={MODE_COLORS.ddnetRace}
        />
        <StatCard
          title="KoG Bingo"
          value={`${gameStats.stats.kogBingoWins ?? 0}W / ${gameStats.stats.kogBingoLosses ?? 0}L`}
          subtitle={`${gameStats.stats.kogBingoTotal ?? 0} games`}
          accentColor={MODE_COLORS.kogBingo}
        />
        <StatCard
          title="KoG Race"
          value={`${gameStats.stats.kogRaceWins ?? 0}W / ${gameStats.stats.kogRaceLosses ?? 0}L`}
          subtitle={`${gameStats.stats.kogRaceTotal ?? 0} games`}
          accentColor={MODE_COLORS.kogRace}
        />
      </div>

      {/* Win Rate Charts + Games Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DualWinRateChart
          bingoWins={gameStats.stats.bingoWins}
          bingoLosses={gameStats.stats.bingoLosses}
          raceWins={gameStats.stats.raceWins}
          raceLosses={gameStats.stats.raceLosses}
          kogBingoWins={gameStats.stats.kogBingoWins ?? 0}
          kogBingoLosses={gameStats.stats.kogBingoLosses ?? 0}
          kogRaceWins={gameStats.stats.kogRaceWins ?? 0}
          kogRaceLosses={gameStats.stats.kogRaceLosses ?? 0}
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
