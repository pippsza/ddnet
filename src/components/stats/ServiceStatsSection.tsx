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
      {/* Platform Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Games"
          value={gameStats.stats.totalGames}
          subtitle={`${gameStats.stats.activeBingo + gameStats.stats.activeRaces} active`}
        />
        <StatCard
          title="Overall Win Rate"
          value={`${gameStats.stats.winRate}%`}
          subtitle={`${gameStats.stats.totalWins}W / ${gameStats.stats.totalLosses}L`}
        />
        <StatCard
          title="Bingo"
          value={`${gameStats.stats.bingoWins}W / ${gameStats.stats.bingoLosses}L`}
          subtitle={`${gameStats.stats.bingoTotal} games`}
        />
        <StatCard
          title="Race"
          value={`${gameStats.stats.raceWins}W / ${gameStats.stats.raceLosses}L`}
          subtitle={`${gameStats.stats.totalRoundsWon} rounds won`}
        />
      </div>

      {/* Win Rate Charts + Games Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DualWinRateChart
          bingoWins={gameStats.stats.bingoWins}
          bingoLosses={gameStats.stats.bingoLosses}
          raceWins={gameStats.stats.raceWins}
          raceLosses={gameStats.stats.raceLosses}
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
