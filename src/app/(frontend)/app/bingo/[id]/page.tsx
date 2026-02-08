'use client'

import { use } from 'react'
import useSWR from 'swr'
import { BingoGrid } from '@/components/bingo/BingoGrid'
import { PlayerCard } from '@/components/bingo/PlayerCard'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { GamePageSkeleton } from '@/components/ui/page-skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
}

export default function BingoGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: game, error, mutate } = useSWR(`/api/bingo/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">Error loading game</div>
  if (!game) return <GamePageSkeleton />

  const gridSize = parseInt(game.gridSize?.split('x')[0] || '3')

  const handleReady = async () => {
    await fetch(`/api/bingo/${id}/ready`, { method: 'POST' })
    mutate()
  }

  const handleStart = async () => {
    await fetch(`/api/bingo/${id}/start`, { method: 'POST' })
    mutate()
  }

  const totalCells = gridSize * gridSize
  const teams = game.teams || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <p className="text-muted-foreground">
            {game.category} &middot; {game.gridSize} &middot; {game.winCondition?.replace(/_/g, ' ')}
          </p>
        </div>
        <StatusBadge status={game.gameStatus} />
      </div>

      {game.inviteCode && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Invite Code: <span className="font-mono font-bold text-foreground">{game.inviteCode}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress Bars - per team */}
      {game.gameStatus === 'in_progress' && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <span className="text-sm font-medium">Progress</span>
            {teams.map((team: any, i: number) => {
              const completed = team.completedCells?.length || 0
              const pct = (completed / totalCells) * 100
              const teamHex = TEAM_COLORS[team.color] || '#3b82f6'
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teamHex }} />
                      {team.name}
                    </span>
                    <span>{completed} / {totalCells}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: teamHex }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Team 1 */}
      {teams[0] && <PlayerCard team={teams[0]} />}

      {/* Bingo Grid */}
      <BingoGrid size={gridSize} maps={game.maps || []} teams={teams} />

      {/* Team 2 */}
      {game.mode === 'team' && teams[1] && <PlayerCard team={teams[1]} />}

      {/* Actions */}
      {game.gameStatus === 'waiting' && (
        <div className="flex gap-2">
          <Button onClick={handleReady}>Toggle Ready</Button>
        </div>
      )}

      {game.gameStatus === 'ready' && (
        <Button onClick={handleStart}>Start Game</Button>
      )}

      {game.gameStatus === 'completed' && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">Game Completed!</p>
            {teams.map((team: any, i: number) => (
              team.status === 'winner' && (
                <p key={i} className="text-muted-foreground mt-1">
                  Winner: {team.name}
                </p>
              )
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
