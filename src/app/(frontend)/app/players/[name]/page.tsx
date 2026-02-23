'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { useDDStats } from '@/hooks/use-ddstats'
import { formatPlaytime, formatDateShort } from '@/lib/format-utils'
import { Skeleton } from '@/components/ui/skeleton'
import { UserPlus, MessageCircle, Check, Wifi, Copy, Map, Server, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

import { StatCard } from '@/components/stats/StatCard'
import { PointsProgressionChart } from '@/components/stats/PointsProgressionChart'
import { CompletionProgressCard } from '@/components/stats/CompletionProgressCard'
import { PlaytimeByMonthChart } from '@/components/stats/PlaytimeByMonthChart'
import { PlaytimeByCategoryChart } from '@/components/stats/PlaytimeByCategoryChart'
import { MostPlayedMapsTable } from '@/components/stats/MostPlayedMapsTable'
import { RecentFinishesTable } from '@/components/stats/RecentFinishesTable'
import { FavoritePartnersCard } from '@/components/stats/FavoritePartnersCard'
import { GeneralActivityCard } from '@/components/stats/GeneralActivityCard'
import { PointsBreakdownCard } from '@/components/stats/PointsBreakdownCard'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function DDStatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function PlayerDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const decodedName = decodeURIComponent(name)
  const { data, isLoading, error } = useSWR(`/api/players/${encodeURIComponent(decodedName)}`, fetcher)

  const reg = data?.registered
  const ddnet = data?.ddnet
  const online = data?.online
  const playerName = reg?.username || ddnet?.player || decodedName

  const { ddstats, ddstatsLoading } = useDDStats(playerName)
  const router = useRouter()
  const [friendSent, setFriendSent] = useState(false)
  const [friendSending, setFriendSending] = useState(false)
  const [chatStarting, setChatStarting] = useState(false)

  const handleAddFriend = async () => {
    if (!reg?.id) return
    setFriendSending(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: reg.id }),
      })
      if (res.ok) setFriendSent(true)
    } catch {
      // ignore
    } finally {
      setFriendSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!reg?.id) return
    setChatStarting(true)
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: reg.id }),
      })
      const data = await res.json()
      if (data.conversation?.id) {
        router.push(`/app/chat?c=${data.conversation.id}`)
      }
    } catch {
      // ignore
    } finally {
      setChatStarting(false)
    }
  }

  if (isLoading) return <DetailPageSkeleton />
  if (error || (!reg && !ddnet)) {
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

  // Skin: prefer registered user skin, fallback to DDStats profile
  const skinName = reg?.skin?.name || ddstats?.profile?.skin_name
  const skinUrl = skinName ? getDDNetSkinUrl(skinName) : undefined
  const skinColorBody = reg?.skin?.colorBody ?? ddstats?.profile?.skin_color_body
  const skinColorFeet = reg?.skin?.colorFeet ?? ddstats?.profile?.skin_color_feet

  const totalPoints = reg?.points || ddnet?.points?.total || 0
  const rank = reg?.rank || ddnet?.points?.rank || null

  // Weekly trend from DDStats
  const weeklyPts = ddstats?.points?.weekly_points?.points
  const weeklyTrend = weeklyPts && weeklyPts > 0 ? `+${weeklyPts} this week` : undefined

  // Playtime from DDStats
  const totalPlaytime = ddstats?.general_activity?.total_seconds_played
  const playingSince = ddstats?.general_activity?.start_of_playtime

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
            bodyColor={skinColorBody}
            feetColor={skinColorFeet}
            size="2xl"
            lookAtCursor
            useCustomColors={!!(skinColorBody || skinColorFeet)}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="text-3xl font-bold">{playerName}</h1>
              {online && (
                <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded font-medium">
                  <Wifi className="h-3 w-3" />
                  Online
                </span>
              )}
              {reg?.isVerified && <StatusBadge status="verified" />}
              {ddstats?.is_mapper && (
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-medium">
                  Mapper
                </span>
              )}
              {reg && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Member
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-muted-foreground flex-wrap">
              <span className="text-lg font-semibold text-foreground">
                {totalPoints.toLocaleString()} points
              </span>
              {rank && <span>Rank #{rank}</span>}
              {totalPlaytime ? (
                <span>{formatPlaytime(totalPlaytime)} played</span>
              ) : ddnet?.hoursPlayed ? (
                <span>{ddnet.hoursPlayed}h played</span>
              ) : null}
            </div>
            {playingSince && (
              <p className="text-sm text-muted-foreground mt-1">
                Playing since {formatDateShort(playingSince)}
              </p>
            )}
            {!playingSince && ddnet?.firstFinish && (
              <p className="text-sm text-muted-foreground mt-1">
                First finish: {new Date(ddnet.firstFinish.timestamp * 1000).toLocaleDateString()} on {ddnet.firstFinish.map}
              </p>
            )}
            <div className="flex gap-2 mt-3 justify-center sm:justify-start flex-wrap">
              {reg?.id && (
                <>
                  <Button
                    size="sm"
                    variant={friendSent ? 'secondary' : 'default'}
                    disabled={friendSent || friendSending}
                    onClick={handleAddFriend}
                  >
                    {friendSent ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Request Sent
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        {friendSending ? 'Sending...' : 'Add Friend'}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendMessage}
                    disabled={chatStarting}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {chatStarting ? 'Opening...' : 'Message'}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://ddnet.org/players/${encodeURIComponent(playerName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DDNet Profile
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://ddstats.tw/player/${encodeURIComponent(playerName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DDStats
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ ONLINE STATUS ═══ */}
      {online?.server && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Wifi className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-500">Currently Playing</p>
                <p className="text-xs text-muted-foreground">Live on a DDNet server right now</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Server</p>
                  <p className="text-sm font-medium truncate">{online.server.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Map</p>
                  <p className="text-sm font-medium truncate">{online.server.map}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <div className="flex items-center gap-1.5">
                    <code className="text-sm font-mono">{online.server.ip}:{online.server.port}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${online.server.ip}:${online.server.port}`)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ SERVICE STATS (primary) ═══ */}
      {reg?.bingo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Bingo Games"
            value={reg.bingo.totalGamesPlayed || 0}
            subtitle={`${reg.bingo.totalGamesWon || 0} won`}
          />
          <StatCard
            title="Win Rate"
            value={`${reg.bingo.winRate || 0}%`}
            subtitle="Bingo"
          />
          <StatCard title="DDNet Points" value={totalPoints.toLocaleString()} trend={weeklyTrend} />
          <StatCard title="Rank" value={rank ? `#${rank}` : '—'} />
        </div>
      )}

      {/* For non-registered players, show DDNet stats in the top grid */}
      {!reg?.bingo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Points" value={totalPoints.toLocaleString()} trend={weeklyTrend} />
          <StatCard title="Rank" value={rank ? `#${rank}` : '—'} />
          <StatCard
            title="Total Playtime"
            value={totalPlaytime ? formatPlaytime(totalPlaytime) : ddnet?.hoursPlayed ? `${ddnet.hoursPlayed}h` : '—'}
          />
          <StatCard
            title="Playing Since"
            value={playingSince ? formatDateShort(playingSince) : '—'}
          />
        </div>
      )}

      {/* ═══ DDNET STATISTICS (secondary) ═══ */}
      {ddstatsLoading ? (
        <DDStatsSkeleton />
      ) : ddstats ? (
        <>
          {reg?.bingo && (
            <div className="pt-2">
              <h2 className="text-lg font-semibold text-muted-foreground">DDNet Statistics</h2>
            </div>
          )}

          {/* Quick DDNet stats row (only for registered players who had bingo stats above) */}
          {reg?.bingo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Playtime"
                value={totalPlaytime ? formatPlaytime(totalPlaytime) : '—'}
              />
              <StatCard
                title="Playing Since"
                value={playingSince ? formatDateShort(playingSince) : '—'}
              />
              <StatCard
                title="Avg / Day"
                value={ddstats.general_activity?.average_seconds_played ? formatPlaytime(ddstats.general_activity.average_seconds_played) : '—'}
              />
              <StatCard
                title="Partners"
                value={ddstats.favourite_teammates?.length || 0}
              />
            </div>
          )}

          {/* Points Progression */}
          <PointsProgressionChart data={ddstats.points_graph} />

          {/* Points by Category + Completion Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PointsBreakdownCard points={ddstats.points} />
            <CompletionProgressCard data={ddstats.completion_progress} />
          </div>

          {/* Playtime charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlaytimeByMonthChart data={ddstats.playtime_per_month} />
            <PlaytimeByCategoryChart data={ddstats.most_played_categories} />
          </div>

          {/* Most Played Maps */}
          <MostPlayedMapsTable data={ddstats.most_played_maps} />

          {/* Recent Finishes */}
          <RecentFinishesTable data={ddstats.recent_finishes} />

          {/* Activity + Partners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GeneralActivityCard
              activity={ddstats.general_activity}
              recentPlayerInfo={ddstats.recent_player_info}
            />
            <FavoritePartnersCard data={ddstats.favourite_teammates} />
          </div>
        </>
      ) : (
        /* Fallback to ddnet.org data if DDStats unavailable */
        ddnet?.lastFinishes && ddnet.lastFinishes.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-semibold mb-3">Recent Finishes</h3>
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
        )
      )}
    </div>
  )
}
