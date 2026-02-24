'use client'

import { use, useState, useMemo, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { PlayerDetailSkeleton } from '@/components/ui/page-skeleton'
import { useDDStats } from '@/hooks/use-ddstats'
import { useGameStats } from '@/hooks/use-game-stats'
import { formatPlaytime, formatDateShort, formatHours } from '@/lib/format-utils'
import { Input } from '@/components/ui/input'
import { UserPlus, MessageCircle, Copy, Map, UserCheck, Clock, ArrowLeft, Gamepad2, Lock, ShieldCheck } from 'lucide-react'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { toast } from 'sonner'

import { ServiceStatsSection } from '@/components/stats/ServiceStatsSection'
import { DDNetSection } from '@/components/stats/DDNetSection'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TAB_TRIGGER_CLASSES =
  'flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-primary'

function PlayerDetailContent({ name }: { name: string }) {
  const decodedName = decodeURIComponent(name)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') || 'service'

  const { data, isLoading, error } = useSWR(`/api/players/${encodeURIComponent(decodedName)}`, fetcher, { refreshInterval: 30000 })
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const { data: pendingData } = useSWR('/api/friends/pending', fetcher)

  const reg = data?.registered
  const ddnet = data?.ddnet
  const online = data?.online
  const playerName = reg?.username || ddnet?.player || decodedName

  const { ddstats, ddstatsLoading } = useDDStats(playerName)
  const gameStats = useGameStats(reg?.id)

  const [friendSent, setFriendSent] = useState(false)
  const [friendSending, setFriendSending] = useState(false)
  const [chatStarting, setChatStarting] = useState(false)
  const [passwordPrompt, setPasswordPrompt] = useState(false)
  const [serverPassword, setServerPassword] = useState('')


  const isOwnProfile = meData?.user?.id && reg?.id && meData.user.id === reg.id

  const friendStatus = useMemo<'friends' | 'pending_sent' | 'pending_received' | 'none'>(() => {
    if (!meData?.user || !reg?.id) return 'none'
    // Check if already friends
    const friends: any[] = meData.user.friend || []
    const isFriend = friends.some((f: any) => {
      const friendId = typeof f.user === 'string' ? f.user : f.user?.id
      return friendId === reg.id
    })
    if (isFriend) return 'friends'
    // Check pending requests
    if (pendingData) {
      const sentToThem = pendingData.outgoing?.some((r: any) => r.otherUser?.id === reg.id)
      if (sentToThem) return 'pending_sent'
      const receivedFromThem = pendingData.incoming?.some((r: any) => r.otherUser?.id === reg.id)
      if (receivedFromThem) return 'pending_received'
    }
    return 'none'
  }, [meData?.user, pendingData, reg?.id])

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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

  const handleSendMessage = () => {
    if (!reg?.id) return
    router.push(`/app/chat?user=${reg.id}`)
  }

  const startChatWithPassword = async (password?: string) => {
    if (!reg?.id) return
    setChatStarting(true)
    try {
      const res = await fetch('/api/ingame-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: reg.id, serverPassword: password || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        // Save containerId for orphan recovery
        if (data.containerId) {
          try {
            localStorage.setItem('ingame-chat-state', JSON.stringify({
              sessionId: data.sessionId,
              containerId: data.containerId,
            }))
          } catch {}
        }
        setPasswordPrompt(false)
        setServerPassword('')
        router.push(`/app/ingame-chat?sessionId=${data.sessionId}`)
      } else if (res.status === 428 && data.passworded) {
        // Server requires password — show password dialog
        setPasswordPrompt(true)
      } else {
        toast.error(data.error || 'Failed to start in-game chat')
      }
    } catch {
      toast.error('Failed to start in-game chat')
    } finally {
      setChatStarting(false)
    }
  }

  const handleChatInGame = async () => {
    await startChatWithPassword()
  }

  const handlePasswordSubmit = async () => {
    if (!serverPassword.trim()) return
    await startChatWithPassword(serverPassword.trim())
  }

  if (isLoading) return <PlayerDetailSkeleton />
  if (error || (!reg && !ddnet)) {
    return (
      <div className="space-y-4">
        <Link href="/app/players" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Players
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

  const totalPoints = reg?.points || ddnet?.points?.points || 0
  const rank = reg?.rank || ddnet?.points?.rank || null

  // Weekly trend from DDStats
  const weeklyPts = ddstats?.points?.weekly_points?.points
  const weeklyTrend = weeklyPts && weeklyPts > 0 ? `+${weeklyPts}` : undefined

  // Playtime from DDStats
  const totalPlaytime = ddstats?.general_activity?.total_seconds_played
  const playingSince = ddstats?.general_activity?.start_of_playtime

  // Current month playtime
  const currentMonthData = ddstats?.playtime_per_month?.at(-1)
  const currentMonthHours = currentMonthData
    ? formatHours(currentMonthData.seconds_played)
    : undefined

  // Map thumbnail for online players
  const mapThumbnailUrl = online?.server?.map
    ? `https://ddnet.org/ranks/maps/${online.server.map.replace(/ /g, '_')}.png`
    : null

  return (
    <div className="space-y-6">
      <Link href="/app/players" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Players
      </Link>

      {/* Profile Hero Card */}
      <Card className="relative overflow-hidden">
        {mapThumbnailUrl && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapThumbnailUrl}
              alt=""
              className="w-full h-full object-cover blur-[2px] scale-110 opacity-30"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/75 to-card/60" />
          </div>
        )}
        <CardContent className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
          <OnlineStatusIndicator
            status={{
              platformOnline: reg?.lastSeenAt
                ? (Date.now() - new Date(reg.lastSeenAt).getTime()) < 2 * 60_000
                : false,
              inGameOnline: !!online,
              serverName: online?.server?.name,
              mapName: online?.server?.map,
            }}
            size="2xl"
            className="shrink-0"
          >
            <TeeAvatarWithFallback
              skinUrl={skinUrl}
              bodyColor={skinColorBody}
              feetColor={skinColorFeet}
              size="2xl"
              lookAtCursor
              useCustomColors={!!(skinColorBody || skinColorFeet)}
            />
          </OnlineStatusIndicator>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="text-3xl font-bold truncate">{playerName}</h1>
              {reg?.isVerified && <StatusBadge status="verified" />}
              {reg && (
                reg.roles && reg.roles !== 'player'
                  ? <RoleBadge role={reg.roles} />
                  : <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Member</span>
              )}
              {ddstats?.is_mapper && (
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-medium">
                  Mapper
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

            {/* Currently playing — inline */}
            {online?.server && (
              <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                <span className="flex items-center gap-1.5 text-green-500">
                  <Map className="h-3.5 w-3.5" />
                  <span className="font-medium">{online.server.map}</span>
                </span>
                <span className="text-muted-foreground truncate">{online.server.name}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <code className="text-xs font-mono">{online.server.ip}:{online.server.port}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${online.server.ip}:${online.server.port}`)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy address"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-3 justify-center sm:justify-start flex-wrap">
              {reg?.id && !isOwnProfile && (
                <>
                  {friendStatus === 'friends' ? (
                    <Button size="sm" variant="secondary" disabled>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Friends
                    </Button>
                  ) : friendStatus === 'pending_sent' || friendSent ? (
                    <Button size="sm" variant="secondary" disabled>
                      <Clock className="h-4 w-4 mr-1" />
                      Request Sent
                    </Button>
                  ) : friendStatus === 'pending_received' ? (
                    <Button size="sm" variant="default" asChild>
                      <Link href="/app/friends">
                        <UserPlus className="h-4 w-4 mr-1" />
                        Accept Request
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={friendSending}
                      onClick={handleAddFriend}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {friendSending ? 'Sending...' : 'Add Friend'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendMessage}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                  {friendStatus === 'friends' && (meData?.user?.isSystemVerified || meData?.user?.roles === 'admin' || meData?.user?.roles === 'moderator') && online && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleChatInGame}
                      disabled={chatStarting}
                    >
                      <Gamepad2 className="h-4 w-4 mr-1" />
                      {chatStarting ? 'Connecting...' : 'Chat In-Game'}
                    </Button>
                  )}
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

            {/* Password prompt for passworded servers */}
            {passwordPrompt && (
              <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Server requires a password</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This server is password-protected. Enter the server password to connect.
                </p>
                <form
                  onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit() }}
                  className="flex gap-2"
                >
                  <Input
                    type="password"
                    placeholder="Server password"
                    value={serverPassword}
                    onChange={(e) => setServerPassword(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="sm" type="submit" disabled={chatStarting || !serverPassword.trim()}>
                    {chatStarting ? 'Connecting...' : 'Connect'}
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => { setPasswordPrompt(false); setServerPassword('') }}>
                    Cancel
                  </Button>
                </form>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                  <span>Your password is sent securely and is not stored. It is only used to connect the bot to the server.</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content: Tabs for registered, DDNet only for unregistered */}
      {reg ? (
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="w-full h-11">
            <TabsTrigger value="service" className={TAB_TRIGGER_CLASSES}>
              Service
            </TabsTrigger>
            <TabsTrigger value="ddnet" className={TAB_TRIGGER_CLASSES}>
              DDNet
            </TabsTrigger>
          </TabsList>

          {/* ═══ SERVICE TAB ═══ */}
          <TabsContent value="service" className="space-y-6 mt-4">
            {reg.bingo ? (
              <ServiceStatsSection gameStats={gameStats} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No service stats available</p>
                  <p className="text-sm">This player hasn&apos;t participated in any bingo or race games yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ DDNET TAB ═══ */}
          <TabsContent value="ddnet" className="space-y-6 mt-4">
            <DDNetSection
              ddstatsLoading={ddstatsLoading}
              ddstats={ddstats}
              ddnet={ddnet}
              totalPoints={totalPoints}
              rank={rank}
              weeklyTrend={weeklyTrend}
              totalPlaytime={totalPlaytime}
              currentMonthHours={currentMonthHours}
              playingSince={playingSince}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* Unregistered: show DDNet content directly */
        <div className="space-y-6">
          <DDNetSection
            ddstatsLoading={ddstatsLoading}
            ddstats={ddstats}
            ddnet={ddnet}
            totalPoints={totalPoints}
            rank={rank}
            weeklyTrend={weeklyTrend}
            totalPlaytime={totalPlaytime}
            currentMonthHours={currentMonthHours}
            playingSince={playingSince}
          />
        </div>
      )}
    </div>
  )
}

export default function PlayerDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  return (
    <Suspense fallback={<PlayerDetailSkeleton />}>
      <PlayerDetailContent name={name} />
    </Suspense>
  )
}
