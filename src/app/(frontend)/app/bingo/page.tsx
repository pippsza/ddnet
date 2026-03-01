'use client'

import { useState, useMemo, Suspense } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Grid3X3, Plus, X, Users, User, Mail, LogIn, Loader2 } from 'lucide-react'
import { CategoryIcon } from '@/components/bingo/CategoryIcon'
import { PageTransition, StaggerContainer, StaggerItem, FadeIn } from '@/components/ui/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function BingoLobbyContent() {
  const t = useTranslations('bingo')
  const router = useRouter()
  const { page: lobbyPage, setPage: setLobbyPage, buildUrl } = usePagination({ defaultLimit: 20, pageParam: 'p' })
  const { page: pastPage, setPage: setPastPage } = usePagination({ defaultLimit: 10, pageParam: 'past' })
  const [inviteCode, setInviteCode] = useState('')
  const [joiningByCode, setJoiningByCode] = useState(false)

  const { data: lobbyData, isLoading: lobbyLoading } = useSWR(
    buildUrl('/api/bingo?where[isPublic][equals]=true&where[gameStatus][equals]=waiting&sort=-createdAt&depth=2'),
    fetcher,
    { refreshInterval: 5000 },
  )
  const { data: myData, isLoading: myLoading, mutate: mutateMyGames } = useSWR('/api/bingo/my-games', fetcher, { refreshInterval: 5000 })

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

  const handleJoinByCode = async () => {
    const trimmed = inviteCode.trim().toUpperCase()
    if (!trimmed) return

    setJoiningByCode(true)
    try {
      const res = await fetch(`/api/bingo/join/${encodeURIComponent(trimmed)}`, {
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
      router.push(`/app/bingo/${data.gameId}`)
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
          <Link href="/app/bingo/create">
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{t('lobby.createGame')}</Button>
          </Link>
        </div>
      </div>

      {/* My Active Games */}
      {myLoading ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lobby.myActiveGames')}</h2>
          <div className="grid gap-3">
            <GameCardSkeleton count={2} />
          </div>
        </section>
      ) : activeGames.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lobby.myActiveGames')}</h2>
          <StaggerContainer className="grid gap-3">
            {activeGames.map((game: any) => (
              <StaggerItem key={game.id}>
                <GameCard game={game} isMine onCancel={() => mutateMyGames()} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      ) : null}

      {/* Public Lobby */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('lobby.publicLobby')}</h2>
        <StaggerContainer className="grid gap-3">
          {lobbyLoading ? (
            <GameCardSkeleton count={3} />
          ) : lobbyGames.length > 0 ? (
            lobbyGames.map((game: any) => (
              <StaggerItem key={game.id}>
                <GameCard game={game} />
              </StaggerItem>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('lobby.noPublicGames')}
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

      {/* Past Games */}
      {allPastGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{t('lobby.pastGames')}</h2>
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
    </PageTransition>
  )
}

function GameCard({ game, isMine, onCancel }: { game: any; isMine?: boolean; onCancel?: () => void }) {
  const t = useTranslations('bingo')
  const [cancelling, setCancelling] = useState(false)
  const isPendingInvite = game.isPendingInvite

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
    <Card className={isPendingInvite ? 'border-yellow-500/40' : isMine ? 'border-primary/30' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPendingInvite ? 'bg-yellow-500/10' : 'bg-muted'}`}>
            {isPendingInvite ? (
              <Mail className="h-5 w-5 text-yellow-500" />
            ) : (
              <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{game.title}</h3>
              {isPendingInvite && (
                <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                  {t('card.invite')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CategoryIcon category={game.category} iconName={game.categoryIcon} className="h-3.5 w-3.5 shrink-0" />
              {game.category} &middot; {game.gridSize} &middot; {game.winCondition?.replace('_', ' ')}
              {game.createdBy?.ingameNick && ` · ${t('card.by', { name: game.createdBy.ingameNick })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {game.mode === 'team' ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {game.teams?.reduce((sum: number, t: any) => sum + (t.players?.length || 0), 0) || game.players || 0}/{game.mode === 'solo' ? 2 : 4}
          </div>
          <StatusBadge status={game.gameStatus} />
          {isMine && !isPendingInvite && game.gameStatus !== 'completed' && (
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
          <Link href={`/app/bingo/${game.id}`}>
            <Button size="sm" variant={isPendingInvite ? 'default' : isMine ? 'default' : 'outline'}>
              {isPendingInvite ? t('card.viewInvite') : isMine ? t('card.open') : t('card.join')}
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
