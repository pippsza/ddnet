'use client'

import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
]

export default function PlayerDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const decodedName = decodeURIComponent(name)
  const { data, isLoading, error } = useSWR(`/api/players/${encodeURIComponent(decodedName)}`, fetcher)

  if (isLoading) return <DetailPageSkeleton />
  if (error || (!data?.registered && !data?.ddnet)) {
    return (
      <div className="space-y-4">
        <Link href="/app/players" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Players
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Player &quot;{decodedName}&quot; not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const reg = data.registered
  const ddnet = data.ddnet
  const playerName = reg?.username || ddnet?.player || decodedName
  const skinUrl = reg?.skin?.name ? getDDNetSkinUrl(reg.skin.name) : undefined
  const totalPoints = reg?.points || ddnet?.points?.total || 0
  const rank = reg?.rank || ddnet?.points?.rank || null

  // Prepare chart data
  const typeData = ddnet?.types
    ? Object.entries(ddnet.types)
        .map(([type, info]: [string, any]) => ({
          name: type,
          points: info.points?.total || 0,
        }))
        .filter((d: any) => d.points > 0)
        .sort((a: any, b: any) => b.points - a.points)
    : []

  const pieData = typeData.slice(0, 8)

  return (
    <div className="space-y-6">
      <Link href="/app/players" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back to Players
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6">
          <TeeAvatarWithFallback
            skinUrl={skinUrl}
            bodyColor={reg?.skin?.colorBody}
            feetColor={reg?.skin?.colorFeet}
            size="2xl"
            lookAtCursor
            useCustomColors={!!(reg?.skin?.colorBody || reg?.skin?.colorFeet)}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="text-3xl font-bold">{playerName}</h1>
              {reg?.isVerified && <StatusBadge status="verified" />}
              {reg && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Member
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-muted-foreground">
              <span className="text-lg font-semibold text-foreground">
                {totalPoints.toLocaleString()} points
              </span>
              {rank && <span>Rank #{rank}</span>}
              {ddnet?.hoursPlayed ? (
                <span>{ddnet.hoursPlayed}h played (last year)</span>
              ) : null}
            </div>
            {ddnet?.firstFinish && (
              <p className="text-sm text-muted-foreground mt-1">
                First finish: {new Date(ddnet.firstFinish.timestamp * 1000).toLocaleDateString()} on {ddnet.firstFinish.map}
              </p>
            )}
            <div className="flex gap-2 mt-3 justify-center sm:justify-start">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://ddnet.org/players/${encodeURIComponent(playerName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DDNet Profile
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Points" value={totalPoints.toLocaleString()} />
        <StatCard title="Rank" value={rank ? `#${rank}` : '—'} />
        {reg?.bingo ? (
          <>
            <StatCard title="Bingo Games" value={reg.bingo.totalGamesPlayed || 0} />
            <StatCard title="Bingo Wins" value={reg.bingo.totalGamesWon || 0} />
          </>
        ) : ddnet?.hoursPlayed !== undefined ? (
          <StatCard title="Hours (Year)" value={ddnet.hoursPlayed} />
        ) : null}
      </div>

      {/* Charts */}
      {typeData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Points by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="points"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Finishes */}
      {ddnet?.lastFinishes && ddnet.lastFinishes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Finishes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {ddnet.lastFinishes.map((finish: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{finish.map}</span>
                    <span className="text-xs text-muted-foreground">{finish.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatTime(finish.time)}</span>
                    <span>{new Date(finish.timestamp * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorite Partners */}
      {ddnet?.favoritePartners && ddnet.favoritePartners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Favorite Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ddnet.favoritePartners.map((partner: any, i: number) => (
                <Link
                  key={i}
                  href={`/app/players/${encodeURIComponent(partner.name)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  <span className="font-medium">{partner.name}</span>
                  <span className="text-xs text-muted-foreground">{partner.finishes} maps</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(2)
  return `${min}:${sec.padStart(5, '0')}`
}
