'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Grid3X3, Plus, X, Users, User } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BingoLobbyPage() {
  const { data: lobbyData } = useSWR('/api/bingo/lobby', fetcher, { refreshInterval: 5000 })
  const { data: myData, mutate: mutateMyGames } = useSWR('/api/bingo/my-games', fetcher, { refreshInterval: 5000 })

  const myGames = myData?.games || []
  const lobbyGames = lobbyData?.games || []
  const activeGames = myGames.filter((g: any) => ['waiting', 'ready', 'in_progress'].includes(g.gameStatus))
  const pastGames = myGames.filter((g: any) => g.gameStatus === 'completed' || g.gameStatus === 'cancelled')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bingo</h1>
        <Link href="/app/bingo/create">
          <Button><Plus className="h-4 w-4 mr-2" />Create Game</Button>
        </Link>
      </div>

      {/* My Active Games */}
      {activeGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">My Active Games</h2>
          <div className="grid gap-3">
            {activeGames.map((game: any) => (
              <GameCard key={game.id} game={game} isMine onCancel={() => mutateMyGames()} />
            ))}
          </div>
        </section>
      )}

      {/* Public Lobby */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Public Lobby</h2>
        <div className="grid gap-3">
          {lobbyGames.map((game: any) => (
            <GameCard key={game.id} game={game} />
          ))}
          {lobbyGames.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No public games available. Create one to get started!
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Past Games */}
      {pastGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Past Games</h2>
          <div className="grid gap-3">
            {pastGames.slice(0, 10).map((game: any) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function GameCard({ game, isMine, onCancel }: { game: any; isMine?: boolean; onCancel?: () => void }) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    if (!confirm('Cancel this game?')) return
    setCancelling(true)
    try {
      await fetch(`/api/bingo/${game.id}/cancel`, { method: 'POST' })
      onCancel?.()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card className={isMine ? 'border-primary/30' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{game.title}</h3>
            <p className="text-sm text-muted-foreground">
              {game.category} &middot; {game.gridSize} &middot; {game.winCondition?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {game.mode === 'team' ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {game.players || 0}/{game.maxPlayers || '?'}
          </div>
          <StatusBadge status={game.gameStatus} />
          {isMine && game.gameStatus !== 'completed' && (
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={cancelling}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Link href={`/app/bingo/${game.id}`}>
            <Button size="sm" variant={isMine ? 'default' : 'outline'}>
              {isMine ? 'Open' : 'Join'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
