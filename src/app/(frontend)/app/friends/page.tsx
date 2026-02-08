'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlayerCard } from '@/components/players/PlayerCard'
import { CardListSkeleton } from '@/components/ui/page-skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FriendsPage() {
  const { data: onlineData, isLoading, mutate: mutateOnline } = useSWR('/api/friends/online', fetcher, {
    refreshInterval: 15000,
  })
  const { data: suggestedData } = useSWR('/api/players/search', fetcher)
  const [friendUsername, setFriendUsername] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const friends = onlineData?.friends || []

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
      setFriendUsername('')
    } catch (err: unknown) {
      setMessage('error:' + (err instanceof Error ? err.message : 'Failed to send request'))
    } finally {
      setSending(false)
    }
  }

  const handleAddFriend = async (username: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('success:Friend request sent to ' + username + '!')
    } catch (err: unknown) {
      setMessage('error:' + (err instanceof Error ? err.message : 'Failed to send request'))
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

  // Filter suggested players to exclude existing friends
  const friendUsernames = new Set(friends.map((f: any) => f.username?.toLowerCase()))
  const suggested = (suggestedData?.registered || []).filter(
    (p: any) => !friendUsernames.has(p.name?.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      {/* Add Friend */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <Input
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="Enter username to add..."
              className="max-w-sm"
            />
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send Request'}
            </Button>
          </form>
          {message && (
            <p
              className={`text-sm mt-2 ${message.startsWith('error:') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
            >
              {message.replace(/^(error|success):/, '')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Friends List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Your Friends ({friends.length})
        </h2>
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friends.map((friend: any) => (
              <div key={friend.userId} className="relative group/friend">
                <PlayerCard
                  name={friend.username}
                  isOnline={friend.online}
                  serverName={friend.server?.name}
                  skin={friend.skin}
                  variant="registered"
                />
                <button
                  onClick={() => handleRemoveFriend(friend.userId)}
                  className="absolute top-2 right-2 opacity-0 group-hover/friend:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-all px-2 py-1 rounded bg-background/80 backdrop-blur-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No friends yet. Send a friend request or add from suggestions below!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggested Players */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Suggested Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggested.slice(0, 8).map((player: any) => (
              <PlayerCard
                key={player.name}
                name={player.name}
                points={player.points}
                rank={player.rank}
                isVerified={player.isVerified}
                skin={player.skin}
                variant="registered"
                showAddFriend
                onAddFriend={() => handleAddFriend(player.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
