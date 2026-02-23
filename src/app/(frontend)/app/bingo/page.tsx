'use client'

import { useState, useMemo, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LobbyPageSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { Grid3X3, Plus, X, Users, User } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function BingoLobbyContent() {
  const { page: lobbyPage, setPage: setLobbyPage, buildUrl } = usePagination({ defaultLimit: 20, pageParam: 'p' })
  const { page: pastPage, setPage: setPastPage } = usePagination({ defaultLimit: 10, pageParam: 'past' })

  const { data: lobbyData } = useSWR(
    buildUrl('/api/bingo?where[isPublic][equals]=true&where[gameStatus][equals]=waiting&sort=-createdAt&depth=2'),
    fetcher,
    { refreshInterval: 5000 },
  )
  const { data: myData, mutate: mutateMyGames } = useSWR('/api/bingo/my-games', fetcher, { refreshInterval: 5000 })

  const myGames = myData?.games || []
  const lobbyGames = lobbyData?.docs || []
  const lobbyTotalPages = lobbyData?.totalPages || 1
  const lobbyTotalDocs = lobbyData?.totalDocs || 0

  const activeGames = myGames.filter((g: any) => ['waiting', 'ready', 'in_progress'].includes(g.gameStatus))
  const allPastGames = myGames.filter((g: any) => g.gameStatus === 'completed' || g.gameStatus === 'cancelled')

  const pastTotalPages = Math.ceil(allPastGames.length / 10)
  const paginatedPastGames = useMemo(
    () => allPastGames.slice((pastPage - 1) * 10, pastPage * 10),
    [allPastGames, pastPage],
  )

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
        <PaginationControls
          page={lobbyPage}
          totalPages={lobbyTotalPages}
          totalDocs={lobbyTotalDocs}
          limit={20}
          onPageChange={setLobbyPage}
        />
      </section>

      {/* Past Games */}
      {allPastGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Past Games</h2>
          <div className="grid gap-3">
            {paginatedPastGames.map((game: any) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          <PaginationControls
            page={pastPage}
            totalPages={pastTotalPages}
            totalDocs={allPastGames.length}
            limit={10}
            onPageChange={setPastPage}
          />
        </section>
      )}
    </div>
  )
}

function GameCard({ game, isMine, onCancel }: { game: any; isMine?: boolean; onCancel?: () => void }) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
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
            {game.teams?.reduce((sum: number, t: any) => sum + (t.players?.length || 0), 0) || game.players || 0}/{game.mode === 'solo' ? 2 : 4}
          </div>
          <StatusBadge status={game.gameStatus} />
          {isMine && game.gameStatus !== 'completed' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={cancelling}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the game for all players. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep playing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel game</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

export default function BingoLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <BingoLobbyContent />
    </Suspense>
  )
}
