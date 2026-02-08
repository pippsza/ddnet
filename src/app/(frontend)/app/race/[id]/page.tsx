'use client'

import { use } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { RaceMap } from '@/components/race/RaceMap'
import { GamePageSkeleton } from '@/components/ui/page-skeleton'
import { cn } from '@/lib/utils'
import { Trophy, Server } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function RaceGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: race, error, mutate } = useSWR(`/api/race/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">Error loading race</div>
  if (!race || race.error) return <GamePageSkeleton />

  const currentUserId = race.currentUserId
  const isInGame = race.players?.some((p: any) => p.id === currentUserId)
  const isCreator = race.createdBy?.id === currentUserId

  const handleReady = async () => {
    await fetch(`/api/race/${id}/ready`, { method: 'POST' })
    mutate()
  }

  const handleStart = async () => {
    await fetch(`/api/race/${id}/start`, { method: 'POST' })
    mutate()
  }

  const handleJoin = async () => {
    await fetch(`/api/race/${id}/join`, { method: 'POST' })
    mutate()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{race.title}</h1>
          <p className="text-muted-foreground">
            {race.category} &middot; {race.totalRounds} rounds
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Server className="h-3.5 w-3.5" />
            {race.server?.name || `${race.server?.ip}:${race.server?.port}`}
          </p>
        </div>
        <StatusBadge status={race.status} />
      </div>

      {race.inviteCode && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Invite Code: <span className="font-mono font-bold text-foreground">{race.inviteCode}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Map */}
      {race.status === 'in_progress' && race.currentMap && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Map</p>
            <p className="text-xl font-bold mt-1">{race.currentMap}</p>
            <p className="text-sm text-muted-foreground">
              Round {race.currentRound} of {race.totalRounds}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Race Map Visualization */}
      {(race.rounds?.length > 0 || race.status === 'in_progress') && (
        <Card>
          <CardContent className="p-4">
            <RaceMap
              rounds={race.rounds || []}
              totalRounds={race.totalRounds}
              currentRound={race.currentRound}
              players={race.players || []}
            />
          </CardContent>
        </Card>
      )}

      {/* Players */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Players ({race.players?.length || 0}/4)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {race.players?.map((player: any, i: number) => {
            const playerColor = PLAYER_COLORS[i % PLAYER_COLORS.length]
            const isWinner = race.winner?.id === player.id
            const skinUrl = player.skin?.name
              ? getDDNetSkinUrl(player.skin.name)
              : undefined

            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border bg-card border-l-2',
                  isWinner && 'ring-2 ring-green-500/50 border-green-500/30',
                )}
                style={{ borderLeftColor: playerColor }}
              >
                <TeeAvatarWithFallback
                  skinUrl={skinUrl}
                  bodyColor={player.skin?.colorBody}
                  feetColor={player.skin?.colorFeet}
                  size="sm"
                  useCustomColors={!!(player.skin?.colorBody || player.skin?.colorFeet)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{player.username}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {player.points > 0 && (
                      <span>{player.points.toLocaleString()} pts</span>
                    )}
                    {player.roundsWon > 0 && (
                      <span className="font-bold text-primary">{player.roundsWon}W</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                  {race.status === 'waiting' && (
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      player.isReady ? 'bg-green-500' : 'bg-gray-400',
                    )} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      {race.status === 'waiting' && (
        <div className="flex gap-2">
          {!isInGame && (
            <Button onClick={handleJoin}>Join Race</Button>
          )}
          {isInGame && (
            <Button onClick={handleReady} variant="outline">Toggle Ready</Button>
          )}
        </div>
      )}

      {race.status === 'ready' && isCreator && (
        <Button onClick={handleStart}>Start Race</Button>
      )}

      {race.status === 'completed' && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">Race Completed!</p>
            {race.winner && (
              <p className="text-muted-foreground mt-1">
                Winner: {race.winner.username || 'Unknown'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
