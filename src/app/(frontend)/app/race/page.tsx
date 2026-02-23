'use client'

import { useState, Suspense } from 'react'
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
import { Flag, Plus, X, Users, Server } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function RaceLobbyContent() {
  const { data: userData } = useSWR('/api/users/me', fetcher)
  const userId = userData?.user?.id

  const { page: lobbyPage, setPage: setLobbyPage, buildUrl: buildLobbyUrl } = usePagination({ defaultLimit: 20, pageParam: 'p' })
  const { page: pastPage, setPage: setPastPage, buildUrl: buildPastUrl } = usePagination({ defaultLimit: 10, pageParam: 'past' })

  const { data: lobbyData } = useSWR(
    buildLobbyUrl('/api/races?where[isPublic][equals]=true&where[status][in]=waiting,ready&sort=-createdAt&depth=1'),
    fetcher,
    { refreshInterval: 5000 },
  )

  // Active races (no pagination — always small count)
  const { data: activeData, mutate: mutateMyRaces } = useSWR(
    userId ? `/api/races?where[players.user][equals]=${userId}&where[status][in]=waiting,ready,in_progress&sort=-createdAt&depth=1&limit=50` : null,
    fetcher,
    { refreshInterval: 5000 },
  )

  // Past races (paginated server-side)
  const { data: pastData } = useSWR(
    userId ? buildPastUrl(`/api/races?where[players.user][equals]=${userId}&where[status][in]=completed,cancelled&sort=-createdAt&depth=1`) : null,
    fetcher,
    { refreshInterval: 5000 },
  )

  const lobbyRaces = lobbyData?.docs || []
  const lobbyTotalPages = lobbyData?.totalPages || 1
  const lobbyTotalDocs = lobbyData?.totalDocs || 0

  const activeRaces = activeData?.docs || []

  const pastRaces = pastData?.docs || []
  const pastTotalPages = pastData?.totalPages || 1
  const pastTotalDocs = pastData?.totalDocs || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Race</h1>
        <Link href="/app/race/create">
          <Button><Plus className="h-4 w-4 mr-2" />Create Race</Button>
        </Link>
      </div>

      {/* My Active Races */}
      {activeRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">My Active Races</h2>
          <div className="grid gap-3">
            {activeRaces.map((race: any) => (
              <RaceCard key={race.id} race={race} isMine onCancel={() => mutateMyRaces()} />
            ))}
          </div>
        </section>
      )}

      {/* Public Lobby */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Public Lobby</h2>
        <div className="grid gap-3">
          {lobbyRaces.map((race: any) => (
            <RaceCard key={race.id} race={race} />
          ))}
          {lobbyRaces.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No public races available. Create one to get started!
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

      {/* Past Races */}
      {pastRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Past Races</h2>
          <div className="grid gap-3">
            {pastRaces.map((race: any) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
          <PaginationControls
            page={pastPage}
            totalPages={pastTotalPages}
            totalDocs={pastTotalDocs}
            limit={10}
            onPageChange={setPastPage}
          />
        </section>
      )}
    </div>
  )
}

function RaceCard({ race, isMine, onCancel }: { race: any; isMine?: boolean; onCancel?: () => void }) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await fetch(`/api/race/${race.id}/cancel`, { method: 'POST' })
      onCancel?.()
    } finally {
      setCancelling(false)
    }
  }

  const serverLabel = race.server?.name || race.server?.ip || 'Unknown'

  return (
    <Card className={isMine ? 'border-primary/30' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Flag className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{race.title}</h3>
            <p className="text-sm text-muted-foreground">
              {race.category} &middot; {race.totalRounds} rounds
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3" /> {serverLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {race.players?.length || 0}/4
          </div>
          <StatusBadge status={race.status} />
          {isMine && race.status !== 'completed' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={cancelling}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel race?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the race for all players. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep racing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel race</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Link href={`/app/race/${race.id}`}>
            <Button size="sm" variant={isMine ? 'default' : 'outline'}>
              {isMine ? 'Open' : 'Join'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RaceLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <RaceLobbyContent />
    </Suspense>
  )
}
