'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPlaytime, formatDateShort } from '@/lib/format-utils'
import { StatCard } from '@/components/stats/StatCard'
import { PointsProgressionChart } from '@/components/stats/PointsProgressionChart'
import { CompletionProgressCard } from '@/components/stats/CompletionProgressCard'
import { PlaytimeByMonthChart } from '@/components/stats/PlaytimeByMonthChart'
import { PlaytimeByCategoryChart } from '@/components/stats/PlaytimeByCategoryChart'
import { PlaytimeByGametypeChart } from '@/components/stats/PlaytimeByGametypeChart'
import { MostPlayedMapsTable } from '@/components/stats/MostPlayedMapsTable'
import { RecentFinishesTable } from '@/components/stats/RecentFinishesTable'
import { FavoritePartnersCard } from '@/components/stats/FavoritePartnersCard'
import { GeneralActivityCard } from '@/components/stats/GeneralActivityCard'
import { PointsBreakdownCard } from '@/components/stats/PointsBreakdownCard'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

export function DDStatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}

export interface DDNetSectionProps {
  ddstatsLoading: boolean
  ddstats: DDStatsPlayerData | null
  ddnet?: any
  totalPoints: number
  rank: number | null
  weeklyTrend?: string
  totalPlaytime?: number
  currentMonthHours?: string
  playingSince?: string
  /** Override the 4th stat card (default: Partners from DDStats) */
  fourthStat?: { title: string; value: string | number }
  /** Limit for recent finishes table */
  recentFinishesLimit?: number
  /** Show MostPlayedMapsTable (player page shows it, dashboard doesn't) */
  showMostPlayedMaps?: boolean
}

export function DDNetSection({
  ddstatsLoading,
  ddstats,
  ddnet,
  totalPoints,
  rank,
  weeklyTrend,
  totalPlaytime,
  currentMonthHours,
  playingSince,
  fourthStat,
  recentFinishesLimit,
  showMostPlayedMaps = true,
}: DDNetSectionProps) {
  if (ddstatsLoading) return <DDStatsSkeleton />

  if (ddstats) {
    return (
      <>
        {/* DDNet Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="DDNet Points"
            value={totalPoints.toLocaleString()}
            subtitle={rank ? `Rank #${rank}` : undefined}
            trend={weeklyTrend}
          />
          <StatCard
            title="Total Playtime"
            value={totalPlaytime ? formatPlaytime(totalPlaytime) : '—'}
            subtitle={currentMonthHours ? `${currentMonthHours} this month` : undefined}
          />
          <StatCard
            title="Playing Since"
            value={playingSince ? formatDateShort(playingSince) : '—'}
          />
          <StatCard
            title={fourthStat?.title || 'Partners'}
            value={fourthStat?.value ?? (ddstats.favourite_teammates?.length || 0)}
          />
        </div>

        {/* Points Breakdown + Completion Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PointsBreakdownCard points={ddstats.points} />
          <CompletionProgressCard data={ddstats.completion_progress} />
        </div>

        {/* Points Progression + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Points Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <PointsProgressionChart data={ddstats.points_graph} compact />
            </CardContent>
          </Card>
          <GeneralActivityCard
            activity={ddstats.general_activity}
            recentPlayerInfo={ddstats.recent_player_info}
          />
        </div>

        {/* Playtime charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlaytimeByMonthChart data={ddstats.playtime_per_month} />
          <PlaytimeByCategoryChart data={ddstats.most_played_categories} />
        </div>

        {/* Gametype breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlaytimeByGametypeChart data={ddstats.most_played_gametypes} />
        </div>

        {/* Most Played Maps */}
        {showMostPlayedMaps && <MostPlayedMapsTable data={ddstats.most_played_maps} />}

        {/* Recent Finishes */}
        <RecentFinishesTable data={ddstats.recent_finishes} limit={recentFinishesLimit} />

        {/* Favorite Partners */}
        <FavoritePartnersCard data={ddstats.favourite_teammates} />
      </>
    )
  }

  if (ddnet) {
    const partners = ddnet.favoritePartners || []
    const finishes = ddnet.lastFinishes || []

    return (
      <>
        {/* Fallback stats from ddnet.org */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="DDNet Points" value={totalPoints.toLocaleString()} subtitle={rank ? `Rank #${rank}` : undefined} />
          <StatCard title="Playtime" value={ddnet.hoursPlayed ? `${ddnet.hoursPlayed}h (last year)` : '—'} />
          <StatCard
            title="First Finish"
            value={ddnet.firstFinish ? new Date(ddnet.firstFinish.timestamp * 1000).toLocaleDateString() : '—'}
            subtitle={ddnet.firstFinish?.map}
          />
          <StatCard title="Partners" value={partners.length || '—'} />
        </div>

        {/* Category breakdown */}
        {ddnet.types && Object.keys(ddnet.types).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Points by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(ddnet.types).map(([category, data]: [string, any]) => (
                  <div key={category} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">{category}</span>
                    <span className="text-sm font-semibold">{data.points?.total || 0} pts</span>
                    <span className="text-xs text-muted-foreground">
                      Rank #{data.points?.rank || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorite Partners */}
        {partners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favorite Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {partners.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.finishes}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Finishes */}
        {finishes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Finishes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {finishes.map((finish: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{finish.map}</span>
                      <span className="text-xs text-muted-foreground">{finish.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {Math.floor(finish.time / 60)}:{(finish.time % 60).toFixed(2).padStart(5, '0')}
                      </span>
                      <span>{new Date(finish.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </>
    )
  }

  if (totalPoints > 0 || rank) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="DDNet Points" value={totalPoints.toLocaleString()} subtitle={rank ? `Rank #${rank}` : undefined} />
          <StatCard title="Rank" value={rank ? `#${rank}` : '—'} />
          <StatCard title="Playtime" value="—" />
          <StatCard title="Partners" value="—" />
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Detailed statistics from DDStats and DDNet are currently unavailable for this player.
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <Card>
      <CardContent className="p-8 text-center text-muted-foreground">
        No DDNet statistics found for this player.
      </CardContent>
    </Card>
  )
}
