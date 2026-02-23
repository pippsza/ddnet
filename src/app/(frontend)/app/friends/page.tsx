'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { cn } from '@/lib/utils'
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

export default function FriendsPage() {
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

  const [friendUsername, setFriendUsername] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const friends = onlineData?.friends || []
  const incoming = pendingData?.incoming || []
  const outgoing = pendingData?.outgoing || []

  const onlineFriends = friends.filter((f: any) => f.online)
  const offlineFriends = friends.filter((f: any) => !f.online)

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!friendUsername.trim()) return
    setSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: friendUsername.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('success:Friend request sent!')
      setSentRequests((prev) => new Set(prev).add(friendUsername.trim().toLowerCase()))
      setFriendUsername('')
      mutatePending()
    } catch (err: unknown) {
      setMessage('error:' + (err instanceof Error ? err.message : 'Failed to send request'))
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
      setMessage('error:' + (err instanceof Error ? err.message : 'Failed to send request'))
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
      await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
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

  if (isLoading) return <CardListSkeleton />

  // Filter suggested players
  const friendUsernames = new Set(friends.map((f: any) => (f.username || f.ingameNick)?.toLowerCase()))
  const outgoingNicks = new Set(outgoing.map((r: any) => r.otherUser?.ingameNick?.toLowerCase()))
  const suggested = (suggestedData?.registered || []).filter(
    (p: any) =>
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
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Enter username or in-game nick..."
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={sending}>
              <UserPlus className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Add Friend'}
            </Button>
          </form>
          {message && (
            <p
              className={cn(
                'text-sm mt-2',
                message.startsWith('error:') ? 'text-destructive' : 'text-green-600 dark:text-green-400',
              )}
            >
              {message.replace(/^(error|success):/, '')}
            </p>
          )}
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
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-blue-500/5 border-blue-500/20"
              >
                <div className="shrink-0">
                  {req.otherUser?.skin?.name ? (
                    <TeeAvatarWithFallback
                      skinUrl={getDDNetSkinUrl(req.otherUser.skin.name)}
                      bodyColor={req.otherUser.skin.color_body}
                      feetColor={req.otherUser.skin.color_feet}
                      size="xs"
                      useCustomColors={!!(req.otherUser.skin.color_body || req.otherUser.skin.color_feet)}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {req.otherUser?.ingameNick?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{req.otherUser?.ingameNick || 'Unknown'}</span>
                  <p className="text-xs text-muted-foreground">
                    wants to be your friend
                    {req.message && ` — "${req.message}"`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
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
              </div>
            ))}

            {/* Outgoing */}
            {outgoing.map((req: any) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <div className="shrink-0">
                  {req.otherUser?.skin?.name ? (
                    <TeeAvatarWithFallback
                      skinUrl={getDDNetSkinUrl(req.otherUser.skin.name)}
                      bodyColor={req.otherUser.skin.color_body}
                      feetColor={req.otherUser.skin.color_feet}
                      size="xs"
                      useCustomColors={!!(req.otherUser.skin.color_body || req.otherUser.skin.color_feet)}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {req.otherUser?.ingameNick?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{req.otherUser?.ingameNick || 'Unknown'}</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Request sent — waiting for response
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelRequest(req.id)}
                  disabled={processingIds.has(req.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your Friends ({friends.length})
            </h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">
                Online ({onlineFriends.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-3">
            <FriendsList friends={friends} onRemove={handleRemoveFriend} />
          </TabsContent>
          <TabsContent value="online" className="mt-3">
            <FriendsList
              friends={onlineFriends}
              onRemove={handleRemoveFriend}
              emptyMessage="No friends online right now."
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Suggested Players */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Suggested Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggested.slice(0, 8).map((player: any) => {
              const alreadySent =
                sentRequests.has(player.name?.toLowerCase()) ||
                outgoingNicks.has(player.name?.toLowerCase())
              const skinUrl = player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined

              return (
                <Card key={player.name} className="hover:shadow-md hover:border-primary/30 transition-all">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Link href={`/app/players/${encodeURIComponent(player.name)}`} className="shrink-0">
                      <TeeAvatarWithFallback
                        skinUrl={skinUrl}
                        bodyColor={player.skin?.colorBody}
                        feetColor={player.skin?.colorFeet}
                        size="sm"
                        useCustomColors={!!(player.skin?.colorBody || player.skin?.colorFeet)}
                      />
                    </Link>
                    <Link
                      href={`/app/players/${encodeURIComponent(player.name)}`}
                      className="flex-1 min-w-0"
                    >
                      <span className="text-sm font-medium hover:text-primary transition-colors truncate block">
                        {player.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {player.points?.toLocaleString()} pts
                        {player.rank && ` · #${player.rank}`}
                      </span>
                    </Link>
                    <Button
                      size="sm"
                      variant={alreadySent ? 'secondary' : 'default'}
                      disabled={alreadySent}
                      onClick={() => handleAddFriend(player.name)}
                      className="shrink-0"
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
                  </CardContent>
                </Card>
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
  emptyMessage = 'No friends yet. Send a friend request or add from suggestions below!',
}: {
  friends: any[]
  onRemove: (id: string) => void
  emptyMessage?: string
}) {
  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {friends.map((friend: any) => {
        const skinUrl = friend.skin?.name ? getDDNetSkinUrl(friend.skin.name) : undefined

        return (
          <Card key={friend.userId} className="group hover:shadow-md transition-all">
            <CardContent className="flex items-center gap-3 p-4">
              <Link
                href={`/app/players/${encodeURIComponent(friend.username || friend.nickname)}`}
                className="shrink-0 relative"
              >
                <TeeAvatarWithFallback
                  skinUrl={skinUrl}
                  bodyColor={friend.skin?.colorBody}
                  feetColor={friend.skin?.colorFeet}
                  size="sm"
                  useCustomColors={!!(friend.skin?.colorBody || friend.skin?.colorFeet)}
                />
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
                    friend.online ? 'bg-green-500' : 'bg-gray-400',
                  )}
                />
              </Link>
              <Link
                href={`/app/players/${encodeURIComponent(friend.username || friend.nickname)}`}
                className="flex-1 min-w-0"
              >
                <span className="text-sm font-medium truncate block hover:text-primary transition-colors">
                  {friend.username || friend.nickname}
                </span>
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
              </Link>
              <button
                onClick={() => onRemove(friend.userId)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
                title="Remove friend"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
