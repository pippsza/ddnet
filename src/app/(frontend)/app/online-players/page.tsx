'use client'

import { useState, useRef, Suspense } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlayerCard } from '@/components/players/PlayerCard'
import { FriendsPageSkeleton } from '@/components/ui/page-skeleton'
import {
  Eye,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Search,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function OnlinePlayersContent() {
  const {
    data,
    isLoading,
    mutate,
  } = useSWR('/api/watched-players', fetcher, { refreshInterval: 15000 })

  const inputRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)

  const players = data?.players || []
  const onlinePlayers = players.filter((p: any) => p.online)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const nickname = inputRef.current?.value?.trim()
    if (!nickname) return
    setAdding(true)
    try {
      const res = await fetch('/api/watched-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error)
      toast.success(`${nickname} added to watchlist`)
      if (inputRef.current) inputRef.current.value = ''
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string, nickname: string) => {
    try {
      await fetch(`/api/watched-players/${id}`, { method: 'DELETE' })
      toast.success(`${nickname} removed from watchlist`)
      mutate()
    } catch {
      toast.error('Failed to remove player')
    }
  }

  const handleToggleNotify = async (id: string, currentValue: boolean) => {
    try {
      await fetch(`/api/watched-players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnline: !currentValue }),
      })
      mutate()
    } catch {
      toast.error('Failed to update notification preference')
    }
  }

  if (isLoading) return <FriendsPageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Online Players</h1>
          {onlinePlayers.length > 0 && (
            <Badge className="bg-green-500 text-white">
              {onlinePlayers.length} online
            </Badge>
          )}
        </div>
        <Badge variant="outline">{players.length}/30</Badge>
      </div>

      {/* Add Player */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Enter DDNet player nickname..."
                className="pl-10"
                maxLength={16}
              />
            </div>
            <Button type="submit" disabled={adding || players.length >= 30}>
              <Plus className="h-4 w-4 mr-2" />
              {adding ? 'Adding...' : 'Watch Player'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Player List */}
      {players.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {players.map((player: any) => (
            <PlayerCard
              key={player.id}
              name={player.nickname}
              skin={player.skin}
              role={player.role}
              isVerified={player.isVerified}
              inGameOnline={player.online}
              serverName={player.server?.name}
              mapName={player.server?.map}
              showMapBackground
              subtitle={
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {player.online ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 truncate">
                        {player.server?.name || 'Online'}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleNotify(player.id, player.notifyOnline)
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded"
                    title={player.notifyOnline ? 'Disable notifications' : 'Enable notifications'}
                  >
                    {player.notifyOnline ? (
                      <Bell className="h-4 w-4 text-blue-500" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemove(player.id, player.nickname)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No players watched yet.</p>
            <p className="text-xs mt-1">
              Add DDNet player nicknames to track their online status. You&apos;ll get
              notified when they come online.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function OnlinePlayersPage() {
  return (
    <Suspense fallback={<FriendsPageSkeleton />}>
      <OnlinePlayersContent />
    </Suspense>
  )
}
