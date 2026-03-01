'use client'

import { useState, useRef, useMemo, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerCard } from '@/components/players/PlayerCard'
import { FriendsPageSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/lib/utils'
import { AfkBadge } from '@/components/tee/OnlineStatusIndicator'
import {
  UserPlus,
  Check,
  X,
  Clock,
  Wifi,
  WifiOff,
  Search,
  Trash2,
} from 'lucide-react'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/animations'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function FriendsContent() {
  const t = useTranslations('friends')
  const {
    data: onlineData,
    isLoading,
    mutate: mutateOnline,
  } = useSWR('/api/friends/online', fetcher, { refreshInterval: 15000 })
  const {
    data: pendingData,
    mutate: mutatePending,
  } = useSWR('/api/friends/pending', fetcher, { refreshInterval: 10000 })
  const { data: suggestedData } = useSWR('/api/players/search', fetcher)
  const { data: meData } = useSWR('/api/users/me', fetcher)

  const friendInputRef = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState(false)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = searchParams.get('tab') || 'all'

  const { page, limit, setPage } = usePagination({ defaultLimit: 12, pageParam: 'p' })

  const friends = onlineData?.friends || []
  const incoming = pendingData?.incoming || []
  const outgoing = pendingData?.outgoing || []

  const onlineFriends = friends.filter((f: any) => f.online)

  const currentList = activeTab === 'online' ? onlineFriends : friends
  const totalPages = Math.ceil(currentList.length / limit)
  const paginatedFriends = useMemo(
    () => currentList.slice((page - 1) * limit, page * limit),
    [currentList, page, limit],
  )

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    params.delete('p')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const username = friendInputRef.current?.value?.trim() || ''
    if (!username) return
    setSending(true)
    // Optimistic: add to outgoing immediately
    const prevPending = pendingData
    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      direction: 'outgoing' as const,
      otherUser: { ingameNick: username },
      createdAt: new Date().toISOString(),
    }
    mutatePending(
      {
        ...pendingData,
        outgoing: [...outgoing, optimisticEntry],
      },
      false,
    )
    setSentRequests((prev) => new Set(prev).add(username.toLowerCase()))
    if (friendInputRef.current) friendInputRef.current.value = ''
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      const data = await res.json()
      if (!res.ok) {
        mutatePending(prevPending, false)
        setSentRequests((prev) => {
          const next = new Set(prev)
          next.delete(username.toLowerCase())
          return next
        })
        throw new Error(data.error)
      }
      toast.success(t('toast.requestSent'))
      mutatePending()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('toast.failedToSend'))
    } finally {
      setSending(false)
    }
  }

  const handleAddFriend = async (username: string, playerData?: any) => {
    setSentRequests((prev) => new Set(prev).add(username.toLowerCase()))
    // Optimistic: add to outgoing immediately
    const prevPending = pendingData
    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      direction: 'outgoing' as const,
      otherUser: {
        ingameNick: username,
        skin: playerData?.skin,
      },
      createdAt: new Date().toISOString(),
    }
    mutatePending(
      {
        ...pendingData,
        outgoing: [...outgoing, optimisticEntry],
      },
      false,
    )
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      const data = await res.json()
      if (!res.ok) {
        mutatePending(prevPending, false)
        setSentRequests((prev) => {
          const next = new Set(prev)
          next.delete(username.toLowerCase())
          return next
        })
        throw new Error(data.error)
      }
      mutatePending()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('toast.failedToSend'))
    }
  }

  const handleAcceptReject = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingIds((prev) => new Set(prev).add(requestId))
    // Optimistic: remove from incoming immediately
    const prevPending = pendingData
    mutatePending(
      {
        ...pendingData,
        incoming: incoming.filter((r: any) => r.id !== requestId),
      },
      false,
    )
    try {
      await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      mutatePending()
      mutateOnline()
    } catch {
      mutatePending(prevPending, false)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId))
    // Optimistic: remove from outgoing immediately
    const prevPending = pendingData
    mutatePending(
      {
        ...pendingData,
        outgoing: outgoing.filter((r: any) => r.id !== requestId),
      },
      false,
    )
    try {
      await fetch(`/api/friend-requests/${requestId}`, {
        method: 'DELETE',
      })
      mutatePending()
    } catch {
      mutatePending(prevPending, false)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    // Optimistic: remove from friends list immediately
    const prevOnline = onlineData
    mutateOnline(
      {
        ...onlineData,
        friends: (onlineData?.friends || []).filter((f: any) => f.userId !== friendId),
      },
      false,
    )
    try {
      const res = await fetch(`/api/friends/${friendId}`, { method: 'DELETE' })
      if (res.ok) mutateOnline()
      else mutateOnline(prevOnline, false)
    } catch {
      mutateOnline(prevOnline, false)
    }
  }

  if (isLoading) return <FriendsPageSkeleton />

  // Filter suggested players (exclude self, friends, pending)
  const myNick = meData?.user?.ingameNick?.toLowerCase()
  const friendUsernames = new Set(friends.map((f: any) => (f.ingameNick || f.nickname)?.toLowerCase()))
  const outgoingNicks = new Set(outgoing.map((r: any) => r.otherUser?.ingameNick?.toLowerCase()))
  const suggested = (suggestedData?.registered || []).filter(
    (p: any) =>
      p.name?.toLowerCase() !== myNick &&
      !friendUsernames.has(p.name?.toLowerCase()) &&
      !outgoingNicks.has(p.name?.toLowerCase()) &&
      !sentRequests.has(p.name?.toLowerCase()),
  )

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {incoming.length > 0 && (
          <Badge className="bg-blue-500 text-white">
            {t('pendingCount', { count: incoming.length })}
          </Badge>
        )}
      </div>

      {/* Add Friend */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={friendInputRef}
                placeholder={t('addFriend.placeholder')}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={sending}>
              <UserPlus className="h-4 w-4 mr-2" />
              {sending ? t('addFriend.sending') : t('addFriend.button')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('pending.title')}</h2>
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* Incoming */}
            {incoming.map((req: any) => (
              <StaggerItem key={req.id}>
              <PlayerCard
                name={req.otherUser?.ingameNick || t('unknownUser')}
                role={(req.otherUser as any)?.primaryRole || req.otherUser?.roles}
                skin={{
                  name: req.otherUser?.skin?.name,
                  colorBody: req.otherUser?.skin?.color_body,
                  colorFeet: req.otherUser?.skin?.color_feet,
                }}
                size="sm"
                className="border-blue-500/20 bg-blue-500/5"
                subtitle={
                  <p className="text-xs text-muted-foreground">
                    {t('pending.wantsToBeYourFriend')}
                    {req.message && ` — "${req.message}"`}
                  </p>
                }
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptReject(req.id, 'accept')}
                      disabled={processingIds.has(req.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('pending.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcceptReject(req.id, 'reject')}
                      disabled={processingIds.has(req.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
              </StaggerItem>
            ))}

            {/* Outgoing */}
            {outgoing.map((req: any) => (
              <StaggerItem key={req.id}>
              <PlayerCard
                name={req.otherUser?.ingameNick || t('unknownUser')}
                role={(req.otherUser as any)?.primaryRole || req.otherUser?.roles}
                skin={{
                  name: req.otherUser?.skin?.name,
                  colorBody: req.otherUser?.skin?.color_body,
                  colorFeet: req.otherUser?.skin?.color_feet,
                }}
                size="sm"
                subtitle={
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('pending.requestSent')}
                  </p>
                }
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelRequest(req.id)}
                    disabled={processingIds.has(req.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t('pending.cancel')}
                  </Button>
                }
              />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t('list.title', { count: friends.length })}
            </h2>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">{t('list.tabAll')}</TabsTrigger>
                <TabsTrigger value="online">
                  {t('list.tabOnline', { count: onlineFriends.length })}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <FriendsList friends={paginatedFriends} onRemove={handleRemoveFriend} />

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalDocs={currentList.length}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {friends.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('list.noFriendsYet')}
          </CardContent>
        </Card>
      )}

      {/* Suggested Players */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{t('suggested.title')}</h2>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {suggested.slice(0, 8).map((player: any) => {
              const alreadySent =
                sentRequests.has(player.name?.toLowerCase()) ||
                outgoingNicks.has(player.name?.toLowerCase())

              return (
                <StaggerItem key={player.name}>
                  <PlayerCard
                    name={player.name}
                    points={player.points}
                    rank={player.rank}
                    skin={player.skin}
                    actions={
                      <Button
                        size="sm"
                        variant={alreadySent ? 'secondary' : 'default'}
                        disabled={alreadySent}
                        onClick={() => handleAddFriend(player.name, player)}
                      >
                        {alreadySent ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {t('suggested.sent')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            {t('suggested.add')}
                          </>
                        )}
                      </Button>
                    }
                  />
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      )}
    </PageTransition>
  )
}

function FriendsList({
  friends,
  onRemove,
}: {
  friends: any[]
  onRemove: (id: string) => void
}) {
  const t = useTranslations('friends')
  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {t('list.noFriendsToShow')}
        </CardContent>
      </Card>
    )
  }

  return (
    <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {friends.map((friend: any) => (
        <StaggerItem key={friend.userId}>
        <PlayerCard
          name={friend.ingameNick || friend.nickname}
          role={(friend as any).primaryRole || friend.roles}
          skin={friend.skin}
          platformOnline={friend.platformOnline ?? false}
          inGameOnline={friend.online ?? false}
          afk={friend.afk ?? false}
          serverName={friend.server?.name}
          mapName={friend.server?.map}
          showMapBackground
          subtitle={
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {friend.online ? (
                <>
                  <Wifi className={cn('h-3 w-3', friend.afk ? 'text-yellow-500' : 'text-green-500')} />
                  <span className={cn('truncate', friend.afk ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')}>
                    {friend.server?.name || t('status.online')}
                  </span>
                  {friend.afk && <AfkBadge />}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  {t('status.offline')}
                </>
              )}
            </span>
          }
          actions={
            <button
              onClick={() => onRemove(friend.userId)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
              title={t('list.removeFriend')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          }
        />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<FriendsPageSkeleton />}>
      <FriendsContent />
    </Suspense>
  )
}
