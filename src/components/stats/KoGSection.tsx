'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatPlaytime, formatTime } from '@/lib/format-utils'
import { getCategoryColor } from '@/lib/chart-constants'
import { StatCard } from '@/components/stats/StatCard'
import type { KoGPlayerData } from '@/lib/kog-types'

export function KoGSkeleton() {
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
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

export interface KoGSectionProps {
  kogLoading: boolean
  kog: KoGPlayerData | null
  finishedMapsLimit?: number
}

export function KoGSection({ kogLoading, kog, finishedMapsLimit = 20 }: KoGSectionProps) {
  const [showAllMaps, setShowAllMaps] = useState(false)

  if (kogLoading) return <KoGSkeleton />

  if (!kog) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No KoG statistics found for this player.
        </CardContent>
      </Card>
    )
  }

  const totalFinished = kog.categoryProgress.reduce((s, c) => s + c.mapsFinished, 0)
  const totalMaps = kog.categoryProgress.reduce((s, c) => s + c.mapsTotal, 0)
  const displayedMaps = showAllMaps ? kog.finishedMaps : kog.finishedMaps.slice(0, finishedMapsLimit)

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="KoG Points"
          value={kog.totalPoints.toLocaleString()}
          subtitle={`Fixed: ${kog.fixedPoints} / Season: ${kog.seasonPoints}`}
          accentColor="#a855f7"
        />
        <StatCard
          title="Rank"
          value={kog.rank ? `#${kog.rank.toLocaleString()}` : '—'}
          accentColor="#a855f7"
        />
        <StatCard
          title="Time on Finishes"
          value={kog.wastedTimeSeconds ? formatPlaytime(kog.wastedTimeSeconds) : '—'}
          accentColor="#a855f7"
        />
        <StatCard
          title="Maps Completed"
          value={`${totalFinished} / ${totalMaps}`}
          accentColor="#a855f7"
        />
      </div>

      {/* Category Completion + Teammates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Progress */}
        {kog.categoryProgress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kog.categoryProgress.map((cat, i) => {
                const pct = cat.mapsTotal > 0 ? (cat.mapsFinished / cat.mapsTotal) * 100 : 0
                const color = getCategoryColor(cat.category, i)
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground text-xs">
                        {cat.mapsFinished} / {cat.mapsTotal}
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Teammates */}
        {kog.teammates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Teammates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {kog.teammates.map((t) => (
                  <Link
                    key={t.name}
                    href={`/app/players/${encodeURIComponent(t.name)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.mapsCount} maps
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Finished Maps */}
      {kog.finishedMaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Finished Maps ({kog.finishedMaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {displayedMaps.map((map) => (
                <div
                  key={map.name}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{map.name}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{map.bestTime}</span>
                    <span className="w-12 text-right">{map.finishes}x</span>
                    <span className="w-24 text-right">{map.lastFinishDate.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
            {kog.finishedMaps.length > finishedMapsLimit && (
              <div className="mt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMaps(!showAllMaps)}
                >
                  {showAllMaps
                    ? 'Show less'
                    : `Show all ${kog.finishedMaps.length} maps`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
