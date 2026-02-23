'use client'

import { useState, useRef, useMemo, Suspense } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerCard } from '@/components/players/PlayerCard'
import { FriendsPageSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function FriendsContent() {
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
  const [activeTab, setActiveTab] = useState('all')

  const { page, limit, setPage, resetPage } = usePagination({ defaultLimit: 12, pageParam: 'p' })

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
    setActiveTab(tab)
    resetPage()
  }

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const username = friendInputRef.current?.value?.trim() || ''
    if (!username) return
    setSending(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Friend request sent!')
      setSentRequests((prev) => new Set(prev).add(username.toLowerCase()))
      if (friendInputRef.current) friendInputRef.current.value = ''
      mutatePending()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  const handleAddFriend = async (username: string) => {
    setSentRequests((prev) => new Set(prev).add(username.toLowerCase()))
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSentRequests((prev) => {
          const next = new Set(prev)
          next.delete(username.toLowerCase())
          return next
        })
        throw new Error(data.error)
      }
      mutatePending()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request')
    }
  }

  const handleAcceptReject = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingIds((prev) => new Set(prev).add(requestId))
    try {
      await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      mutatePending()
      mutateOnline()
    } catch {
      // ignore
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
    try {
      await fetch(`/api/friend-requests/${requestId}`, {
        method: 'DELETE',
      })
      mutatePending()
    } catch {
      // ignore
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await fetch(`/api/friends/${friendId}`, { method: 'DELETE' })
      if (res.ok) mutateOnline()
    } catch {
      // ignore
    }
  }

  if (isLoading) return <FriendsPageSkeleton />

  // Filter suggested players (exclude self, friends, pending)
  const myNick = meData?.user?.ingameNick?.toLowerCase()
  const friendUsernames = new Set(friends.map((f: any) => (f.username || f.ingameNick)?.toLowerCase()))
  const outgoingNicks = new Set(outgoing.map((r: any) => r.otherUser?.ingameNick?.toLowerCase()))
  const suggested = (suggestedData?.registered || []).filter(
    (p: any) =>
      p.name?.toLowerCase() !== myNick &&
      !friendUsernames.has(p.name?.toLowerCase()) &&
      !outgoingNicks.has(p.name?.toLowerCase()) &&
      !sentRequests.has(p.name?.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Friends</h1>
        {incoming.length > 0 && (
          <Badge className="bg-blue-500 text-white">
            {incoming.length} pending
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
                placeholder="Enter username or in-game nick..."
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={sending}>
              <UserPlus className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Add Friend'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Incoming */}
            {incoming.map((req: any) => (
              <PlayerCard
                key={req.id}
                name={req.otherUser?.ingameNick || 'Unknown'}
                role={req.otherUser?.roles}
                skin={{
                  name: req.otherUser?.skin?.name,
                  colorBody: req.otherUser?.skin?.color_body,
                  colorFeet: req.otherUser?.skin?.color_feet,
                }}
                size="sm"
                className="border-blue-500/20 bg-blue-500/5"
                subtitle={
                  <p className="text-xs text-muted-foreground">
                    wants to be your friend
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
                      Accept
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
            ))}

            {/* Outgoing */}
            {outgoing.map((req: any) => (
              <PlayerCard
                key={req.id}
                name={req.otherUser?.ingameNick || 'Unknown'}
                role={req.otherUser?.roles}
                skin={{
                  name: req.otherUser?.skin?.name,
                  colorBody: req.otherUser?.skin?.color_body,
                  colorFeet: req.otherUser?.skin?.color_feet,
                }}
                size="sm"
                subtitle={
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Request sent — waiting for response
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
                    Cancel
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your Friends ({friends.length})
            </h2>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="online">
                  Online ({onlineFriends.length})
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
            No friends yet. Send a friend request or add from suggestions below!
          </CardContent>
        </Card>
      )}

      {/* Suggested Players */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Suggested Players</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {suggested.slice(0, 8).map((player: any) => {
              const alreadySent =
                sentRequests.has(player.name?.toLowerCase()) ||
                outgoingNicks.has(player.name?.toLowerCase())

              return (
                <PlayerCard
                  key={player.name}
                  name={player.name}
                  points={player.points}
                  rank={player.rank}
                  skin={player.skin}
                  actions={
                    <Button
                      size="sm"
                      variant={alreadySent ? 'secondary' : 'default'}
                      disabled={alreadySent}
                      onClick={() => handleAddFriend(player.name)}
                    >
                      {alreadySent ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Sent
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  }
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function FriendsList({
  friends,
  onRemove,
}: {
  friends: any[]
  onRemove: (id: string) => void
}) {
  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No friends to show.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {friends.map((friend: any) => (
        <PlayerCard
          key={friend.userId}
          name={friend.username || friend.nickname}
          role={friend.roles}
          skin={friend.skin}
          platformOnline={friend.platformOnline ?? false}
          inGameOnline={friend.online ?? false}
          serverName={friend.server?.name}
          mapName={friend.server?.map}
          showMapBackground
          subtitle={
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {friend.online ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 truncate">
                    {friend.server?.name || 'Online'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </span>
          }
          actions={
            <button
              onClick={() => onRemove(friend.userId)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
              title="Remove friend"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          }
        />
      ))}
    </div>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<FriendsPageSkeleton />}>
      <FriendsContent />
    </Suspense>
  )
}
