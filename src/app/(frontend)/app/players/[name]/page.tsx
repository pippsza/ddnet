'use client'

import { use, useState, useMemo, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { PlayerDetailSkeleton } from '@/components/ui/page-skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import { useBotSettings } from '@/hooks/use-bot-settings'
import { useDDStats } from '@/hooks/use-ddstats'
import { useGameStats } from '@/hooks/use-game-stats'
import { formatPlaytime, formatDateShort, formatHours } from '@/lib/format-utils'
import { Input } from '@/components/ui/input'
import {
  UserPlus,
  UserMinus,
  MessageCircle,
  Copy,
  Map,
  X,
  ArrowLeft,
  Gamepad2,
  Lock,
  ShieldCheck,
  Settings,
} from 'lucide-react'
import { OnlineStatusIndicator, AfkBadge } from '@/components/tee/OnlineStatusIndicator'
import { toast } from 'sonner'

import { ServiceStatsSection } from '@/components/stats/ServiceStatsSection'
import { DDNetSection } from '@/components/stats/DDNetSection'
import { PlayerSettingsTab } from '@/components/admin/PlayerSettingsTab'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TAB_TRIGGER_CLASSES =
  'flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-primary'

function PlayerDetailContent({ name }: { name: string }) {
  const t = useTranslations('players')
  const decodedName = decodeURIComponent(name)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') || 'service'

  const {
    data,
    isLoading,
    error,
    mutate: mutatePlayer,
  } = useSWR(`/api/players/${encodeURIComponent(decodedName)}`, fetcher, { refreshInterval: 30000 })
  const { data: meData, mutate: mutateMe } = useSWR('/api/users/me', fetcher)
  const { data: pendingData, mutate: mutatePending } = useSWR('/api/friends/pending', fetcher)

  const { botSettings } = useBotSettings()
  const reg = data?.registered
  const ddnet = data?.ddnet
  const online = data?.online
  const playerName = reg?.ingameNick || ddnet?.player || decodedName

  const { ddstats, ddstatsLoading } = useDDStats(playerName)
  const gameStats = useGameStats(reg?.id)
  const { isAdmin, permissions } = usePermissions()

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
    // Optimistic: show as pending_sent immediately
    const prevPending = pendingData
    mutatePending(
      {
        ...pendingData,
        outgoing: [...(pendingData?.outgoing || []), { otherUser: { id: reg.id } }],
      },
      false,
    )
    try {
      await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: reg.id }),
      })
      mutatePending()
    } catch {
      mutatePending(prevPending, false)
    } finally {
      setFriendSending(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!reg?.id) return
    setFriendSending(true)
    // Optimistic: remove from friends list immediately
    const prevMe = meData
    mutateMe(
      {
        ...meData,
        user: {
          ...meData?.user,
          friend: (meData?.user?.friend || []).filter((f: any) => {
            const fId = typeof f.user === 'string' ? f.user : f.user?.id
            return fId !== reg.id
          }),
        },
      },
      false,
    )
    try {
      await fetch(`/api/friends/${reg.id}`, { method: 'DELETE' })
      mutateMe()
    } catch {
      mutateMe(prevMe, false)
    } finally {
      setFriendSending(false)
    }
  }

  const handleCancelRequest = async () => {
    const request = pendingData?.outgoing?.find((r: any) => r.otherUser?.id === reg?.id)
    if (!request) return
    setFriendSending(true)
    // Optimistic: remove from outgoing immediately
    const prevPending = pendingData
    mutatePending(
      {
        ...pendingData,
        outgoing: (pendingData?.outgoing || []).filter((r: any) => r.id !== request.id),
      },
      false,
    )
    try {
      await fetch(`/api/friend-requests/${request.id}`, { method: 'DELETE' })
      mutatePending()
    } catch {
      mutatePending(prevPending, false)
    } finally {
      setFriendSending(false)
    }
  }

  const handleAcceptRequest = async () => {
    const request = pendingData?.incoming?.find((r: any) => r.otherUser?.id === reg?.id)
    if (!request) return
    setFriendSending(true)
    // Optimistic: move from pending to friends
    const prevPending = pendingData
    const prevMe = meData
    mutatePending(
      {
        ...pendingData,
        incoming: (pendingData?.incoming || []).filter((r: any) => r.id !== request.id),
      },
      false,
    )
    mutateMe(
      {
        ...meData,
        user: {
          ...meData?.user,
          friend: [...(meData?.user?.friend || []), { user: { id: reg.id } }],
        },
      },
      false,
    )
    try {
      await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action: 'accept' }),
      })
      mutatePending()
      mutateMe()
    } catch {
      mutatePending(prevPending, false)
      mutateMe(prevMe, false)
    } finally {
      setFriendSending(false)
    }
  }

  const handleSendMessage = () => {
    if (!reg?.id) return
    router.push(`/app/chat?user=${reg.id}`)
  }

  const startChatWithPassword = async (password?: string) => {
    if (!reg?.id && !playerName) return
    setChatStarting(true)
    try {
      const body = reg?.id
        ? { targetUserId: reg.id, serverPassword: password || undefined }
        : { targetNickname: playerName, serverPassword: password || undefined }
      const res = await fetch('/api/ingame-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        // Save containerId for orphan recovery
        if (data.containerId) {
          try {
            localStorage.setItem(
              'ingame-chat-state',
              JSON.stringify({
                sessionId: data.sessionId,
                containerId: data.containerId,
              }),
            )
          } catch {}
        }
        setPasswordPrompt(false)
        setServerPassword('')
        router.push(`/app/ingame-chat?sessionId=${data.sessionId}`)
      } else if (res.status === 428 && data.passworded) {
        // Server requires password — show password dialog
        setPasswordPrompt(true)
      } else {
        toast.error(data.error || t('detail.ingameChat.failed'))
      }
    } catch {
      toast.error(t('detail.ingameChat.failed'))
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
        <Link
          href="/app/players"
          className="flex items-center  gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t('detail.backToPlayers')}
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('detail.notFound', { name: decodedName })}
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
      <Link
        href="/app/players"
        className=" items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex"
      >
        <ArrowLeft className="h-4 w-4" /> {t('detail.backToPlayers')}
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
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/75 to-card/60" />
          </div>
        )}
        <CardContent className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
          <OnlineStatusIndicator
            status={{
              platformOnline: reg?.lastSeenAt
                ? Date.now() - new Date(reg.lastSeenAt).getTime() < 2 * 60_000
                : false,
              inGameOnline: !!online,
              afk: online?.afk ?? false,
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
              {reg && <RoleBadge role={(reg as any).primaryRole || reg.roles || 'player'} />}
              {ddstats?.is_mapper && (
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-medium">
                  {t('detail.mapper')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-muted-foreground flex-wrap">
              <span className="text-lg font-semibold text-foreground">
                {t('detail.points', { count: totalPoints.toLocaleString() })}
              </span>
              {rank && <span>{t('detail.rank', { rank })}</span>}
              {totalPlaytime ? (
                <span>{formatPlaytime(totalPlaytime)} {t('detail.played')}</span>
              ) : ddnet?.hoursPlayed ? (
                <span>{ddnet.hoursPlayed}h {t('detail.played')}</span>
              ) : null}
            </div>
            {playingSince && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('detail.playingSince', { date: formatDateShort(playingSince) })}
              </p>
            )}
            {!playingSince && ddnet?.firstFinish && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('detail.firstFinish', { date: new Date(ddnet.firstFinish.timestamp * 1000).toLocaleDateString(), map: ddnet.firstFinish.map })}
              </p>
            )}

            {/* Currently playing — inline */}
            {online?.server && (
              <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                <span
                  className={`flex items-center gap-1.5 ${online.afk ? 'text-yellow-500' : 'text-green-500'}`}
                >
                  <Map className="h-3.5 w-3.5" />
                  <span className="font-medium">{online.server.map}</span>
                  {online.afk && <AfkBadge />}
                </span>
                <span className="text-muted-foreground truncate">{online.server.name}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <code className="text-xs font-mono">
                    {online.server.ip}:{online.server.port}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(`${online.server.ip}:${online.server.port}`)
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={t('detail.copyAddress')}
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
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={friendSending}
                      onClick={handleRemoveFriend}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      {friendSending ? t('detail.friend.removing') : t('detail.friend.remove')}
                    </Button>
                  ) : friendStatus === 'pending_sent' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={friendSending}
                      onClick={handleCancelRequest}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {friendSending ? t('detail.friend.cancelling') : t('detail.friend.cancelRequest')}
                    </Button>
                  ) : friendStatus === 'pending_received' ? (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={friendSending}
                      onClick={handleAcceptRequest}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {friendSending ? t('detail.friend.accepting') : t('detail.friend.acceptRequest')}
                    </Button>
                  ) : (
                    <Button size="sm" disabled={friendSending} onClick={handleAddFriend}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      {friendSending ? t('detail.friend.sending') : t('detail.friend.add')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleSendMessage}>
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {t('detail.friend.message')}
                  </Button>
                </>
              )}
              {botSettings.ingameChatBotEnabled &&
                (meData?.user?.isSystemVerified ||
                  isAdmin ||
                  (permissions?.adminPages?.length ?? 0) > 0) &&
                online && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleChatInGame}
                    disabled={chatStarting}
                  >
                    <Gamepad2 className="h-4 w-4 mr-1" />
                    {chatStarting ? t('detail.ingameChat.connecting') : t('detail.ingameChat.button')}
                  </Button>
                )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://ddnet.org/players/${encodeURIComponent(playerName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('detail.externalLinks.ddnetProfile')}
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://ddstats.tw/player/${encodeURIComponent(playerName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('detail.externalLinks.ddstats')}
                </a>
              </Button>
            </div>

            {/* Password prompt for passworded servers */}
            {passwordPrompt && (
              <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('detail.passwordPrompt.title')}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('detail.passwordPrompt.description')}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handlePasswordSubmit()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="password"
                    placeholder={t('detail.passwordPrompt.placeholder')}
                    value={serverPassword}
                    onChange={(e) => setServerPassword(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="sm" type="submit" disabled={chatStarting || !serverPassword.trim()}>
                    {chatStarting ? t('detail.ingameChat.connecting') : t('detail.passwordPrompt.connect')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setPasswordPrompt(false)
                      setServerPassword('')
                    }}
                  >
                    {t('detail.passwordPrompt.cancel')}
                  </Button>
                </form>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                  <span>
                    {t('detail.passwordPrompt.securityNote')}
                  </span>
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
              {t('detail.tabs.service')}
            </TabsTrigger>
            <TabsTrigger value="ddnet" className={TAB_TRIGGER_CLASSES}>
              {t('detail.tabs.ddnet')}
            </TabsTrigger>
            {(isAdmin || permissions?.adminPages?.includes('manage_users')) && (
              <TabsTrigger value="settings" className={TAB_TRIGGER_CLASSES}>
                <Settings className="h-4 w-4 mr-1.5" />
                {t('detail.tabs.settings')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ═══ SERVICE TAB ═══ */}
          <TabsContent value="service" className="space-y-6 mt-4">
            {reg.bingo ? (
              <ServiceStatsSection gameStats={gameStats} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">{t('detail.noServiceStats')}</p>
                  <p className="text-sm">
                    {t('detail.noServiceStatsDescription')}
                  </p>
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

          {/* ═══ SETTINGS TAB (admin / manage_users) ═══ */}
          {(isAdmin || permissions?.adminPages?.includes('manage_users')) && (
            <TabsContent value="settings" className="mt-4">
              <PlayerSettingsTab user={reg} mutate={mutatePlayer} />
            </TabsContent>
          )}
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
