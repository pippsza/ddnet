'use client'

import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { LobbyPageSkeleton, GameCardSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { Flag, Plus, X, Users, Server, LogIn, Loader2 } from 'lucide-react'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function RaceLobbyContent() {
  const t = useTranslations('race')
  const router = useRouter()
  const { data: userData } = useSWR('/api/users/me', fetcher)
  const userId = userData?.user?.id

  const [inviteCode, setInviteCode] = useState('')
  const [joiningByCode, setJoiningByCode] = useState(false)

  const { page: lobbyPage, setPage: setLobbyPage, buildUrl: buildLobbyUrl } = usePagination({ defaultLimit: 20, pageParam: 'p' })
  const { page: pastPage, setPage: setPastPage, buildUrl: buildPastUrl } = usePagination({ defaultLimit: 10, pageParam: 'past' })

  const { data: lobbyData, isLoading: lobbyLoading } = useSWR(
    buildLobbyUrl('/api/races?where[isPublic][equals]=true&where[gameStatus][in]=waiting,ready&sort=-createdAt&depth=1'),
    fetcher,
    { refreshInterval: 5000 },
  )

  const { data: activeData, isLoading: activeLoading, mutate: mutateMyRaces } = useSWR(
    userId ? `/api/races?where[teams.players.user][equals]=${userId}&where[gameStatus][in]=waiting,ready,in_progress&sort=-createdAt&depth=1&limit=50` : null,
    fetcher,
    { refreshInterval: 5000 },
  )

  const { data: pastData } = useSWR(
    userId ? buildPastUrl(`/api/races?where[teams.players.user][equals]=${userId}&where[gameStatus][in]=completed,cancelled&sort=-createdAt&depth=1`) : null,
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

  const handleJoinByCode = async () => {
    const trimmed = inviteCode.trim().toUpperCase()
    if (!trimmed) return

    setJoiningByCode(true)
    try {
      const res = await fetch(`/api/game/join/${encodeURIComponent(trimmed)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || t('lobby.joinFailed'))
        setJoiningByCode(false)
        return
      }

      toast.success(data.message || t('lobby.joinSuccess'))
      router.push(`/app/race/${data.raceId}`)
    } catch {
      toast.error(t('lobby.joinFailed'))
      setJoiningByCode(false)
    }
  }

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('lobby.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={t('lobby.inviteCodePlaceholder')}
              className="w-28 h-9 text-center font-mono text-xs tracking-wider"
              maxLength={8}
              disabled={joiningByCode}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinByCode()
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleJoinByCode}
              disabled={joiningByCode || !inviteCode.trim()}
            >
              {joiningByCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            </Button>
          </div>
          <Link href="/app/race/create">
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{t('lobby.createRace')}</Button>
          </Link>
        </div>
      </div>

      {activeLoading ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lobby.myActiveRaces')}</h2>
          <div className="grid gap-3">
            <GameCardSkeleton count={2} />
          </div>
        </section>
      ) : activeRaces.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lobby.myActiveRaces')}</h2>
          <StaggerContainer className="grid gap-3">
            {activeRaces.map((race: any) => (
              <StaggerItem key={race.id}>
                <RaceCard race={race} isMine onCancel={() => mutateMyRaces()} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('lobby.publicLobby')}</h2>
        <StaggerContainer className="grid gap-3">
          {lobbyLoading ? (
            <GameCardSkeleton count={3} />
          ) : lobbyRaces.length > 0 ? (
            lobbyRaces.map((race: any) => (
              <StaggerItem key={race.id}>
                <RaceCard race={race} />
              </StaggerItem>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('lobby.noPublicRaces')}
              </CardContent>
            </Card>
          )}
        </StaggerContainer>
        <PaginationControls
          page={lobbyPage}
          totalPages={lobbyTotalPages}
          totalDocs={lobbyTotalDocs}
          limit={20}
          onPageChange={setLobbyPage}
        />
      </section>

      {pastRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{t('lobby.pastRaces')}</h2>
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
    </PageTransition>
  )
}

function RaceCard({ race, isMine, onCancel }: { race: any; isMine?: boolean; onCancel?: () => void }) {
  const t = useTranslations('race')
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await fetch(`/api/game/${race.id}/cancel`, { method: 'POST' })
      onCancel?.()
    } finally {
      setCancelling(false)
    }
  }

  const serverLabel = race.server?.name || race.server?.ip || t('lobby.unknownServer')
  const totalPlayers = race.teams?.reduce(
    (sum: number, t: any) => sum + (t.players?.length || 0),
    0,
  ) || 0
  const maxPlayers = race.mode === 'solo' ? 2 : 4

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
              {race.category} &middot; {race.pathLength} {t('lobby.steps')} &middot; {race.mode}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3" /> {serverLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {totalPlayers}/{maxPlayers}
          </div>
          <StatusBadge status={race.gameStatus || race.status} />
          {isMine && race.gameStatus !== 'completed' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={cancelling}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('cancel.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('cancel.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel.keep')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>{t('cancel.confirm')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Link href={`/app/race/${race.id}`}>
            <Button size="sm" variant={isMine ? 'default' : 'outline'}>
              {isMine ? t('card.open') : t('card.join')}
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
