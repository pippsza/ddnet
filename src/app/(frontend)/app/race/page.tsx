'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Flag, Plus, X, Users, Server } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function RaceLobbyPage() {
  const { data: lobbyData } = useSWR('/api/race/lobby', fetcher, { refreshInterval: 5000 })
  const { data: myData, mutate: mutateMyRaces } = useSWR('/api/race/my-races', fetcher, { refreshInterval: 5000 })

  const myRaces = myData?.races || []
  const lobbyRaces = lobbyData?.races || []
  const activeRaces = myRaces.filter((r: any) => ['waiting', 'ready', 'in_progress'].includes(r.status))
  const pastRaces = myRaces.filter((r: any) => r.status === 'completed' || r.status === 'cancelled')

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
      </section>

      {/* Past Races */}
      {pastRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Past Races</h2>
          <div className="grid gap-3">
            {pastRaces.slice(0, 10).map((race: any) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function RaceCard({ race, isMine, onCancel }: { race: any; isMine?: boolean; onCancel?: () => void }) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    if (!confirm('Cancel this race?')) return
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
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={cancelling}>
              <X className="h-4 w-4" />
            </Button>
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
