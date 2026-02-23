'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { DashboardSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { useDDStats } from '@/hooks/use-ddstats'
import { useGameStats } from '@/hooks/use-game-stats'
import { formatPlaytime, formatDateShort, formatHours } from '@/lib/format-utils'

import { StatCard } from '@/components/stats/StatCard'
import { WinRateChart } from '@/components/stats/WinRateChart'
import { GamesTimelineChart } from '@/components/stats/GamesTimelineChart'
import { RecentGamesCard } from '@/components/stats/RecentGamesCard'
import { RaceStatsCard } from '@/components/stats/RaceStatsCard'
import { CategoryPerformanceCard } from '@/components/stats/CategoryPerformanceCard'
import { PointsProgressionChart } from '@/components/stats/PointsProgressionChart'
import { CompletionProgressCard } from '@/components/stats/CompletionProgressCard'
import { PlaytimeByMonthChart } from '@/components/stats/PlaytimeByMonthChart'
import { PlaytimeByCategoryChart } from '@/components/stats/PlaytimeByCategoryChart'
import { RecentFinishesTable } from '@/components/stats/RecentFinishesTable'
import { FavoritePartnersCard } from '@/components/stats/FavoritePartnersCard'
import { GeneralActivityCard } from '@/components/stats/GeneralActivityCard'
import { PointsBreakdownCard } from '@/components/stats/PointsBreakdownCard'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DashboardPage() {
  const { data: user, isLoading } = useSWR('/api/users/me', fetcher)

  const userData = user?.user
  const { ddstats } = useDDStats(userData?.ingameNick)
  const gameStats = useGameStats(userData?.id)

  if (isLoading) return <DashboardSkeleton />

  const skinUrl = userData?.ingameStats?.skin?.name
    ? getDDNetSkinUrl(userData.ingameStats.skin.name)
    : undefined

  // Weekly trend from DDStats
  const weeklyPts = ddstats?.points?.weekly_points?.points
  const weeklyTrend = weeklyPts && weeklyPts > 0 ? `+${weeklyPts}` : undefined

  // Playtime from DDStats
  const totalPlaytime = ddstats?.general_activity?.total_seconds_played

  // Current month playtime
  const currentMonthData = ddstats?.playtime_per_month?.at(-1)
  const currentMonthHours = currentMonthData
    ? formatHours(currentMonthData.seconds_played)
    : undefined

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative">
            <TeeAvatarWithFallback
              skinUrl={skinUrl}
              bodyColor={userData?.ingameStats?.skin?.colorBody}
              feetColor={userData?.ingameStats?.skin?.colorFeet}
              size="xl"
              lookAtCursor
              useCustomColors={!!(userData?.ingameStats?.skin?.colorBody || userData?.ingameStats?.skin?.colorFeet)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{userData?.ingameNick || 'Unknown'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {userData?.isSystemVerified && (
                <StatusBadge status="verified" />
              )}
              <span className="text-sm text-muted-foreground capitalize">{userData?.roles}</span>
            </div>
            {userData?.ingameStats?.points !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {userData.ingameStats.points.toLocaleString()} DDNet points
                {userData.ingameStats.rank && (
                  <span className="opacity-60"> &middot; Rank #{userData.ingameStats.rank}</span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ SERVICE STATS (primary) ═══ */}

      {/* Service Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">B</span>
              Bingo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create or join a bingo game to compete on DDNet maps
            </p>
            <div className="flex gap-2">
              <Link href="/app/bingo/create" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Game
              </Link>
              <Link href="/app/bingo" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Browse Lobby
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm font-bold">R</span>
              Race
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Race against other players on DDNet servers
            </p>
            <div className="flex gap-2">
              <Link href="/app/race/create" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Race
              </Link>
              <Link href="/app/race" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Browse Lobby
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Win Rate + Race Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WinRateChart
          wins={gameStats.stats.totalWins}
          losses={gameStats.stats.totalLosses}
          winRate={gameStats.stats.winRate}
        />
        <RaceStatsCard
          raceWins={gameStats.stats.raceWins}
          raceLosses={gameStats.stats.raceLosses}
          raceTotal={gameStats.stats.raceTotal}
          totalRoundsWon={gameStats.stats.totalRoundsWon}
          totalRoundsPlayed={gameStats.stats.totalRoundsPlayed}
          activeRaces={gameStats.stats.activeRaces}
        />
      </div>

      {/* Games Timeline + Category Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GamesTimelineChart data={gameStats.monthlyData} />
        <CategoryPerformanceCard categoryStats={gameStats.categoryStats} />
      </div>

      {/* Recent Games */}
      <RecentGamesCard games={gameStats.history} />

      {/* ═══ DDNET STATS (secondary) ═══ */}

      {ddstats && (
        <>
          <div className="pt-2">
            <h2 className="text-lg font-semibold text-muted-foreground">DDNet Statistics</h2>
          </div>

          {/* DDNet Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="DDNet Points"
              value={userData?.ingameStats?.points?.toLocaleString() || '—'}
              subtitle={userData?.ingameStats?.rank ? `Rank #${userData.ingameStats.rank}` : undefined}
              trend={weeklyTrend}
            />
            <StatCard
              title="Total Playtime"
              value={totalPlaytime ? formatPlaytime(totalPlaytime) : '—'}
              subtitle={currentMonthHours ? `${currentMonthHours} this month` : undefined}
            />
            <StatCard
              title="Playing Since"
              value={ddstats.general_activity?.start_of_playtime ? formatDateShort(ddstats.general_activity.start_of_playtime) : '—'}
            />
            <StatCard
              title="Friends"
              value={userData?.friend?.length || 0}
            />
          </div>

          {/* Points Chart + Completion Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ddstats.points_graph?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Points Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <PointsProgressionChart data={ddstats.points_graph} compact />
                </CardContent>
              </Card>
            )}
            {ddstats.completion_progress?.length > 0 && (
              <CompletionProgressCard data={ddstats.completion_progress} compact />
            )}
          </div>

          {/* Points Breakdown + Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PointsBreakdownCard points={ddstats.points} />
            <GeneralActivityCard
              activity={ddstats.general_activity}
              recentPlayerInfo={ddstats.recent_player_info}
            />
          </div>

          {/* Playtime charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlaytimeByMonthChart data={ddstats.playtime_per_month} />
            <PlaytimeByCategoryChart data={ddstats.most_played_categories} />
          </div>

          {/* Recent Finishes */}
          <RecentFinishesTable data={ddstats.recent_finishes} limit={10} />

          {/* Favorite Partners */}
          <FavoritePartnersCard data={ddstats.favourite_teammates} />
        </>
      )}
    </div>
  )
}
