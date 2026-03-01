'use client'

import { use, useState, useRef, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowLeftRight,
  Copy,
  Check,
  UserPlus,
  X,
  Play,
  CheckCircle2,
  Circle,
  LogIn,
  LogOut,
  Loader2,
  Settings2,
  Grid3x3,
  Swords,
  Flag,
  RotateCcw,
} from 'lucide-react'
import { BingoGrid } from '@/components/bingo/BingoGrid'
import { BingoGridPreview } from '@/components/bingo/BingoGridPreview'
import { GamePlayerBar } from '@/components/bingo/GamePlayerBar'
import { GameStartCountdown } from '@/components/bingo/GameStartCountdown'
import { GameEndOverlay } from '@/components/game/GameEndOverlay'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GamePageSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { FriendInviteSearch } from '@/components/bingo/FriendInviteSearch'
import { CategorySelect } from '@/components/CategorySelect'
import { CategoryIcon } from '@/components/bingo/CategoryIcon'
import { getCategoryLabelUniversal } from '@/lib/ddnet-constants'
import { ModeSelector } from '@/components/bingo/ModePreview'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { PageTransition, FadeIn } from '@/components/ui/animations'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
}

interface Player {
  id: string
  ingameNick: string
  points?: number
  skin?: { name: string; colorBody: number; colorFeet: number } | null
  isReady: boolean
  roles?: string
}

interface PendingInvite {
  id: string
  ingameNick: string
  skin?: { name: string; colorBody: number; colorFeet: number } | null
}

interface Team {
  index: number
  name: string
  color: string
  status: string
  players: Player[]
  pendingInvites?: PendingInvite[]
  completedCells?: { position: number; completedAt?: string }[]
}

type GridSize = '3x3' | '5x5' | '7x7'
type WinCondition = 'line' | 'cross' | 'full_house'

export default function BingoGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('bingo')
  const [countdownDone, setCountdownDone] = useState(false)

  // Read team index from URL for invited players
  const [inviteTeamIndex, setInviteTeamIndex] = useState<number | undefined>(undefined)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const team = urlParams.get('team')
    if (team !== null) setInviteTeamIndex(parseInt(team))
  }, [])

  const {
    data: game,
    error,
    mutate,
  } = useSWR(`/api/bingo/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">{t('game.errorLoading')}</div>
  if (!game) return <GamePageSkeleton />

  const isWaiting = game.gameStatus === 'waiting' || game.gameStatus === 'ready'

  if (isWaiting) {
    return (
      <LobbyView
        game={game}
        gameId={id}
        mutate={mutate}
        router={router}
        inviteTeamIndex={inviteTeamIndex}
      />
    )
  }

  // Show countdown if game just started (within 10 seconds)
  const skipCountdown = game.startedAt && Date.now() - new Date(game.startedAt).getTime() > 10000
  const gridSize = parseInt(game.gridSize?.split('x')[0] || '3')

  if (!countdownDone && !skipCountdown && game.gameStatus === 'in_progress') {
    return (
      <GameStartCountdown
        maps={game.maps || []}
        gridSize={gridSize}
        onComplete={() => setCountdownDone(true)}
      />
    )
  }

  return <GameView game={game} gameId={id} mutate={mutate} router={router} />
}

// ─── Lobby View (waiting/ready) ──────────────────────────────────────────────

function LobbyView({
  game,
  gameId,
  mutate,
  router,
  inviteTeamIndex,
}: {
  game: any
  gameId: string
  mutate: () => void
  router: ReturnType<typeof useRouter>
  inviteTeamIndex?: number
}) {
  const t = useTranslations('bingo')
  const [actionLoading, setActionLoading] = useState(false)
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set())
  const [settingsError, setSettingsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings')

  // Settings state (creator only — initialized from game data)
  const [title, setTitle] = useState(game.title)
  const [category, setCategory] = useState(game.category)
  const [gridSize, setGridSize] = useState<GridSize>(game.gridSize)
  const [winCondition, setWinCondition] = useState<WinCondition>(game.winCondition)
  const [mode, setMode] = useState<'solo' | 'team'>(game.mode)
  const [diffMin, setDiffMin] = useState(game.difficultyRange?.min ?? 0)
  const [diffMax, setDiffMax] = useState(game.difficultyRange?.max ?? 5)
  const [isPublic, setIsPublic] = useState(game.isPublic)
  const [availableMapCount, setAvailableMapCount] = useState<number | null>(null)

  // Batched settings updates
  const pendingRef = useRef<Record<string, any>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Last confirmed server state for revert on error
  const confirmedRef = useRef({
    title: game.title,
    category: game.category,
    gridSize: game.gridSize as GridSize,
    winCondition: game.winCondition as WinCondition,
    mode: game.mode as 'solo' | 'team',
    diffMin: game.difficultyRange?.min ?? 0,
    diffMax: game.difficultyRange?.max ?? 5,
    isPublic: game.isPublic,
  })

  const serverTeams: Team[] = game.teams || []
  const isCreator = game.isCreator
  const canEditSettings = isCreator && game.createdVia !== 'client'
  const isInGame = game.isCurrentUserInGame
  const myTeamIndex: number | null = game.currentUserTeamIndex

  // Optimistic teams: show/hide Team 2 immediately on mode switch
  const teams: Team[] = (() => {
    if (!canEditSettings) return serverTeams
    if (mode === 'team' && serverTeams.length === 1) {
      return [
        serverTeams[0],
        {
          index: 1,
          name: 'Team 2',
          color: 'blue',
          status: 'not_ready',
          players: [],
          completedCells: [],
        },
      ]
    }
    if (mode === 'solo' && serverTeams.length === 2) {
      return [serverTeams[0]]
    }
    return serverTeams
  })()

  // Creator is always considered ready (no Ready button) — matches backend start API
  const canStart = (() => {
    if (!isCreator) return false
    if (game.gameStatus === 'ready') return true
    if (teams.length === 0) return false
    for (const t of teams) {
      if (t.players.length === 0) return false
      for (const p of t.players) {
        if (p.id !== game.createdBy?.id && !p.isReady) return false
      }
    }
    return true
  })()

  const amReady = (() => {
    if (myTeamIndex == null || !game.currentUserId) return false
    const myTeam = teams[myTeamIndex]
    if (!myTeam) return false
    const me = myTeam.players.find((p) => p.id === game.currentUserId)
    return me?.isReady ?? false
  })()

  // ─── Batched settings save ─────────────────────────────────────────────────

  const revertFromServer = useCallback((fields: string[]) => {
    const c = confirmedRef.current
    for (const f of fields) {
      switch (f) {
        case 'title':
          setTitle(c.title)
          break
        case 'category':
          setCategory(c.category)
          break
        case 'gridSize':
          setGridSize(c.gridSize)
          break
        case 'winCondition':
          setWinCondition(c.winCondition)
          break
        case 'mode':
          setMode(c.mode)
          break
        case 'difficultyMin':
          setDiffMin(c.diffMin)
          break
        case 'difficultyMax':
          setDiffMax(c.diffMax)
          break
        case 'isPublic':
          setIsPublic(c.isPublic)
          break
      }
    }
  }, [])

  const flushSettings = useCallback(async () => {
    const batch = { ...pendingRef.current }
    pendingRef.current = {}
    if (Object.keys(batch).length === 0) return

    const batchKeys = Object.keys(batch)
    setSettingsError('')
    try {
      const res = await fetch(`/api/bingo/${gameId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!res.ok) {
        const data = await res.json()
        setSettingsError(data.error || t('settings.failedToUpdate'))
        setTimeout(() => setSettingsError(''), 4000)
        revertFromServer(batchKeys)
      } else {
        // Update confirmed state to match optimistic values
        for (const key of batchKeys) {
          if (key === 'title') confirmedRef.current.title = batch.title
          else if (key === 'category') confirmedRef.current.category = batch.category
          else if (key === 'gridSize') confirmedRef.current.gridSize = batch.gridSize
          else if (key === 'winCondition') confirmedRef.current.winCondition = batch.winCondition
          else if (key === 'mode') confirmedRef.current.mode = batch.mode
          else if (key === 'difficultyMin') confirmedRef.current.diffMin = batch.difficultyMin
          else if (key === 'difficultyMax') confirmedRef.current.diffMax = batch.difficultyMax
          else if (key === 'isPublic') confirmedRef.current.isPublic = batch.isPublic
        }
      }
      mutate()
    } catch {
      setSettingsError(t('settings.failedToSave'))
      setTimeout(() => setSettingsError(''), 4000)
      revertFromServer(batchKeys)
    } finally {
      setSavingFields((prev) => {
        const next = new Set(prev)
        for (const key of batchKeys) next.delete(key)
        return next
      })
    }
  }, [gameId, mutate, revertFromServer])

  const updateSettings = useCallback(
    (patch: Record<string, any>) => {
      Object.assign(pendingRef.current, patch)
      setSavingFields((prev) => {
        const next = new Set(prev)
        for (const key of Object.keys(patch)) next.add(key)
        return next
      })
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(flushSettings, 300)
    },
    [flushSettings],
  )

  // ─── Settings change handlers ──────────────────────────────────────────────

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    titleTimeoutRef.current = setTimeout(() => updateSettings({ title: val }), 500)
  }

  const handleCategoryChange = (val: string, mapCount: number | null) => {
    setCategory(val)
    setAvailableMapCount(mapCount)
    const cells: Record<string, number> = { '3x3': 9, '5x5': 25, '7x7': 49 }
    let newGridSize = gridSize
    if (mapCount !== null && cells[gridSize] > mapCount) {
      const valid = (['7x7', '5x5', '3x3'] as GridSize[]).find((gs) => cells[gs] <= mapCount)
      if (valid) {
        newGridSize = valid
        setGridSize(valid)
      }
    }
    updateSettings({ category: val, gridSize: newGridSize })
  }

  const handleGridSizeChange = (size: GridSize) => {
    const cells: Record<string, number> = { '3x3': 9, '5x5': 25, '7x7': 49 }
    if (availableMapCount !== null && cells[size] > availableMapCount) return
    setGridSize(size)
    updateSettings({ gridSize: size })
  }

  const handleWinConditionChange = (wc: WinCondition) => {
    setWinCondition(wc)
    updateSettings({ winCondition: wc })
  }

  const handleModeChange = (m: 'solo' | 'team') => {
    if (m === 'solo' && serverTeams.length > 1) {
      const team2 = serverTeams[1]
      const hasPlayers = team2.players.length > 0
      const hasPending = (team2.pendingInvites?.length || 0) > 0
      if (hasPlayers || hasPending) {
        toast.error(t('team.cannotSwitchSolo'))
        return
      }
    }
    setMode(m)
    updateSettings({ mode: m })
  }

  const handleDiffBlur = (field: 'min' | 'max', val: number) => {
    if (field === 'min') updateSettings({ difficultyMin: val })
    else updateSettings({ difficultyMax: val })
  }

  const handlePublicToggle = (val: boolean) => {
    setIsPublic(val)
    updateSettings({ isPublic: val })
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleReady = async () => {
    setActionLoading(true)
    await fetch(`/api/bingo/${gameId}/ready`, { method: 'POST' })
    mutate()
    setActionLoading(false)
  }

  const handleStart = async () => {
    setActionLoading(true)
    await fetch(`/api/bingo/${gameId}/start`, { method: 'POST' })
    mutate()
    setActionLoading(false)
  }

  const handleJoin = async () => {
    setActionLoading(true)
    await fetch(`/api/bingo/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIndex: inviteTeamIndex }),
    })
    mutate()
    setActionLoading(false)
  }

  const handleCancel = async () => {
    await fetch(`/api/bingo/${gameId}/cancel`, { method: 'POST' })
    router.push('/app/bingo')
  }

  const handleLeave = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/bingo/${gameId}/leave`, { method: 'POST' })
    if (res.ok) {
      router.push('/app/bingo')
    } else {
      const data = await res.json()
      toast.error(data.error || t('leave.failed'))
      setActionLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (game.inviteCode) {
      navigator.clipboard.writeText(game.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSwitchTeam = async (targetTeamIndex: number) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/bingo/${gameId}/switch-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTeamIndex }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('team.failedToSwitch'))
      }
    } catch {
      toast.error(t('team.failedToSwitch'))
    } finally {
      mutate()
      setActionLoading(false)
    }
  }

  // ─── Settings section ─────────────────────────────────────────────────────

  const settingsContent = (
    <div className="space-y-4">
      {/* Title */}
      {canEditSettings ? (
        <div>
          <Label htmlFor="title">{t('settings.gameTitle')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('settings.gameTitlePlaceholder')}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{game.title}</h1>
          <StatusBadge status={game.gameStatus} />
        </div>
      )}

      {/* Category */}
      {canEditSettings ? (
        <div>
          <Label>{t('settings.category')}</Label>
          <CategorySelect
            name="category"
            value={category}
            onValueChange={handleCategoryChange}
            disabled={savingFields.has('category')}
          />
        </div>
      ) : (
        <div className="text-sm flex items-center gap-1.5">
          <span className="text-muted-foreground">{t('settings.categoryLabel')}</span>
          <CategoryIcon
            category={game.category}
            iconName={game.categoryIcon}
            className="h-4 w-4 text-muted-foreground"
          />
          <span className="font-medium">{getCategoryLabelUniversal(game.category)}</span>
        </div>
      )}

      {/* Difficulty */}
      {canEditSettings ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('settings.minDifficulty')}</Label>
            <Input
              type="number"
              min={0}
              max={5}
              value={diffMin}
              onChange={(e) => setDiffMin(Number(e.target.value))}
              onBlur={(e) => handleDiffBlur('min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t('settings.maxDifficulty')}</Label>
            <Input
              type="number"
              min={0}
              max={5}
              value={diffMax}
              onChange={(e) => setDiffMax(Number(e.target.value))}
              onBlur={(e) => handleDiffBlur('max', Number(e.target.value))}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('settings.difficultyLabel')}</span>{' '}
          <span className="font-medium">
            {game.difficultyRange?.min ?? 0} – {game.difficultyRange?.max ?? 5} {t('settings.stars')}
          </span>
        </div>
      )}

      {/* Mode */}
      {canEditSettings ? (
        <div>
          <Label>{t('settings.mode')}</Label>
          <ModeSelector
            mode={mode}
            onModeChange={handleModeChange}
            disabled={savingFields.has('mode')}
          />
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('settings.modeLabel')}</span>{' '}
          <span className="font-medium capitalize">{game.mode}</span>
        </div>
      )}

      {/* Public toggle */}
      {canEditSettings ? (
        <div className="flex items-center gap-2">
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={handlePublicToggle}
            disabled={savingFields.has('isPublic')}
          />
          <Label htmlFor="isPublic" className="mb-0">
            {t('settings.publicGame')}
          </Label>
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('settings.visibilityLabel')}</span>{' '}
          <span className="font-medium">{game.isPublic ? t('settings.public') : t('settings.private')}</span>
        </div>
      )}

      {/* Invite code */}
      {game.inviteCode && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('settings.inviteCode')}</span>
          <code className="font-mono font-bold bg-muted px-2 py-0.5 rounded">
            {game.inviteCode}
          </code>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopyCode}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}

      {/* Settings error */}
      {settingsError && <p className="text-sm text-red-500">{settingsError}</p>}

      {/* Teams */}
      {(canEditSettings ? mode : game.mode) === 'team' ? (
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          {teams[0] && (
            <div className="flex-1">
              <LobbyTeamCard
                team={teams[0]}
                gameId={gameId}
                isMyTeam={myTeamIndex === 0}
                isInGame={isInGame}
                isCreator={isCreator}
                creatorId={game.createdBy?.id}
                gameMode={mode}
                onSwitchTeam={handleSwitchTeam}
                mutate={mutate}
              />
            </div>
          )}
          <div className="flex items-center justify-center py-2 md:py-0">
            <Swords className="h-5 w-5 text-muted-foreground" />
          </div>
          {teams[1] && (
            <div className="flex-1">
              <LobbyTeamCard
                team={teams[1]}
                gameId={gameId}
                isMyTeam={myTeamIndex === 1}
                isInGame={isInGame}
                isCreator={isCreator}
                creatorId={game.createdBy?.id}
                gameMode={mode}
                onSwitchTeam={handleSwitchTeam}
                mutate={mutate}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teams.map((team: Team) => (
            <LobbyTeamCard
              key={team.index}
              team={team}
              gameId={gameId}
              isMyTeam={myTeamIndex === team.index}
              isInGame={isInGame}
              isCreator={isCreator}
              mutate={mutate}
            />
          ))}
        </div>
      )}
    </div>
  )

  // ─── Grid preview ─────────────────────────────────────────────────────────

  const gridPreviewContent = canEditSettings ? (
    <BingoGridPreview
      gridSize={gridSize}
      winCondition={winCondition}
      onGridSizeChange={handleGridSizeChange}
      onWinConditionChange={handleWinConditionChange}
      availableMapCount={availableMapCount}
      disabled={
        savingFields.has('gridSize') ||
        savingFields.has('category') ||
        savingFields.has('winCondition')
      }
    />
  ) : (
    <div className="pointer-events-none opacity-80">
      <BingoGridPreview
        gridSize={game.gridSize}
        winCondition={game.winCondition}
        onGridSizeChange={() => {}}
        onWinConditionChange={() => {}}
        availableMapCount={0}
      />
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTransition className="h-full flex flex-col overflow-hidden relative">
      {/* Top bar */}
      <div className="shrink-0 border-b">
        <div className="flex items-center justify-between py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('game.back')}
          </Button>
          <div className="flex items-center gap-2">
            {savingFields.size > 0 && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {isCreator && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
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
            {!isInGame && (
              <Button size="sm" onClick={handleJoin} disabled={actionLoading}>
                <LogIn className="h-4 w-4 mr-1.5" />
                {actionLoading ? t('game.joining') : t('game.joinGame')}
              </Button>
            )}
            {isInGame && !isCreator && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={actionLoading}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('leave.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('leave.stay')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>{t('leave.leave')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant={amReady ? 'destructive' : 'default'}
                  onClick={handleReady}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {actionLoading ? '...' : amReady ? t('game.unready') : t('game.ready')}
                </Button>
              </>
            )}
            {isCreator && (
              <Button size="sm" onClick={handleStart} disabled={!canStart || actionLoading}>
                <Play className="h-4 w-4 mr-1.5" />
                {actionLoading ? t('game.starting') : t('game.startGame')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: two columns */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 pt-4 flex-1 min-h-0">
        <div className="min-h-0 overflow-y-auto pr-2">{settingsContent}</div>
        <div className="min-h-0 flex items-center justify-center">{gridPreviewContent}</div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col">
        <div
          className={
            mobileTab === 'settings' ? 'flex-1 min-h-0 overflow-y-auto pb-16 px-4 pt-4' : 'hidden'
          }
        >
          {settingsContent}
        </div>
        <div
          className={
            mobileTab === 'preview'
              ? 'flex-1 min-h-0 flex flex-col items-center justify-center pb-16 px-4'
              : 'hidden'
          }
        >
          {gridPreviewContent}
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setMobileTab((t) => (t === 'settings' ? 'preview' : 'settings'))}
          className="gap-2 rounded-full px-5 shadow-lg bg-background border-2"
        >
          {mobileTab === 'settings' ? (
            <>
              <Grid3x3 className="h-4 w-4" />
              {t('settings.preview')}
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4" />
              {t('settings.settingsTab')}
            </>
          )}
        </Button>
      </div>
    </PageTransition>
  )
}

// ─── Lobby Team Card ──────────────────────────────────────────────────────────

function LobbyTeamCard({
  team,
  gameId,
  isMyTeam,
  isInGame,
  isCreator,
  creatorId,
  gameMode,
  onSwitchTeam,
  mutate,
}: {
  team: Team
  gameId: string
  isMyTeam: boolean
  isInGame: boolean
  isCreator: boolean
  creatorId?: string
  gameMode?: string
  onSwitchTeam?: (teamIndex: number) => void
  mutate: () => void
}) {
  const t = useTranslations('bingo')
  const [inviting, setInviting] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  // Optimistic pending invites: local state synced from server, updated immediately on invite/cancel
  const [optimisticPending, setOptimisticPending] = useState<PendingInvite[]>(
    team.pendingInvites || [],
  )
  const serverPendingRef = useRef(team.pendingInvites)

  // Sync from server when server data changes
  if (team.pendingInvites !== serverPendingRef.current) {
    serverPendingRef.current = team.pendingInvites
    setOptimisticPending(team.pendingInvites || [])
  }

  const teamHex = TEAM_COLORS[team.color] || '#3b82f6'
  const pendingCount = optimisticPending.length
  const hasSpace = team.players.length + pendingCount < 2
  const canInvite = hasSpace && isInGame && (isMyTeam || isCreator)
  const canCancelInvite = isInGame && (isMyTeam || isCreator)

  const handleInvite = async (
    player: {
      id: string
      name: string
      skin?: { name: string; colorBody: number; colorFeet: number }
    } | null,
  ) => {
    if (!player) return

    // Optimistic: add to local pending immediately
    const optimisticEntry: PendingInvite = {
      id: player.id,
      ingameNick: player.name,
      skin: player.skin || null,
    }
    setOptimisticPending((prev) => [...prev, optimisticEntry])
    setInviting(false)
    setInviteLoading(true)

    try {
      const res = await fetch(`/api/bingo/${gameId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamIndex: team.index }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Revert optimistic update
        setOptimisticPending((prev) => prev.filter((p) => p.id !== player.id))
        toast.error(data.error || t('team.failedToInvite'))
      }
    } catch {
      setOptimisticPending((prev) => prev.filter((p) => p.id !== player.id))
      toast.error(t('team.failedToInvite'))
    } finally {
      setInviteLoading(false)
      mutate()
    }
  }

  const handleCancelInvite = async (playerId: string) => {
    // Optimistic: remove from local pending immediately
    const removed = optimisticPending.find((p) => p.id === playerId)
    setOptimisticPending((prev) => prev.filter((p) => p.id !== playerId))

    try {
      const res = await fetch(`/api/bingo/${gameId}/invite`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamIndex: team.index }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Revert: add back
        if (removed) setOptimisticPending((prev) => [...prev, removed])
        toast.error(data.error || t('team.failedToCancelInvite'))
      }
    } catch {
      if (removed) setOptimisticPending((prev) => [...prev, removed])
      toast.error(t('team.failedToCancelInvite'))
    } finally {
      mutate()
    }
  }

  return (
    <Card
      className={cn('border-l-4 transition-all h-full', isMyTeam && 'ring-1 ring-primary/20')}
      style={{ borderLeftColor: teamHex }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: teamHex }} />
          <span className="font-semibold text-sm">{team.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {team.players.length + pendingCount}/2
          </span>
        </div>

        <div className="space-y-2">
          {/* Active players */}
          {team.players.map((player: Player) => {
            const skinUrl = player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                <TeeAvatarWithFallback
                  skinUrl={skinUrl}
                  bodyColor={player.skin?.colorBody}
                  feetColor={player.skin?.colorFeet}
                  size="xs"
                  useCustomColors={!!(player.skin?.colorBody || player.skin?.colorFeet)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{player.ingameNick}</span>
                  {player.points !== undefined && player.points > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {player.points.toLocaleString()} {t('team.pts')}
                    </span>
                  )}
                </div>
                {player.id === creatorId ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-muted-foreground/30 text-muted-foreground"
                  >
                    {t('team.host')}
                  </Badge>
                ) : player.isReady ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-green-500/50 text-green-600 dark:text-green-400"
                  >
                    {t('team.joined')}
                  </Badge>
                )}
              </div>
            )
          })}

          {/* Pending invites */}
          {optimisticPending.map((invite: PendingInvite) => {
            const skinUrl = invite.skin?.name ? getDDNetSkinUrl(invite.skin.name) : undefined
            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5 opacity-70"
              >
                <TeeAvatarWithFallback
                  skinUrl={skinUrl}
                  bodyColor={invite.skin?.colorBody}
                  feetColor={invite.skin?.colorFeet}
                  size="xs"
                  useCustomColors={!!(invite.skin?.colorBody || invite.skin?.colorFeet)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{invite.ingameNick}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                >
                  {t('team.invited')}
                </Badge>
                {canCancelInvite && (
                  <button
                    type="button"
                    onClick={() => handleCancelInvite(invite.id)}
                    className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Invite button */}
          {canInvite && !inviting && (
            <button
              type="button"
              onClick={() => setInviting(true)}
              className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-muted-foreground/30 w-full text-left hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <span className="text-sm text-muted-foreground">
                {isMyTeam ? t('team.inviteTeammate') : t('team.inviteOpponent')}
              </span>
            </button>
          )}

          {canInvite && inviting && (
            <div className="space-y-2">
              <FriendInviteSearch value={null} onChange={handleInvite} />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setInviting(false)}
                disabled={inviteLoading}
              >
                {t('team.cancelInvite')}
              </Button>
            </div>
          )}

          {/* Waiting slot — no invite permission and has space */}
          {hasSpace && !canInvite && !onSwitchTeam && (
            <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-muted-foreground/20">
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>
              <span className="text-xs text-muted-foreground/50">{t('team.waitingForPlayer')}</span>
            </div>
          )}

          {/* Switch team button — shown on the other team's card */}
          {isInGame && !isMyTeam && gameMode === 'team' && hasSpace && onSwitchTeam && (
            <button
              type="button"
              onClick={() => onSwitchTeam(team.index)}
              className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-primary/30 w-full text-left hover:bg-primary/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                <ArrowLeftRight className="h-3.5 w-3.5 text-primary/50" />
              </div>
              <span className="text-sm text-primary/70">{t('team.switchTeam')}</span>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Game View (in_progress / completed / cancelled) ─────────────────────────

function GameView({
  game,
  gameId,
  mutate,
  router,
}: {
  game: any
  gameId: string
  mutate: () => void
  router: ReturnType<typeof useRouter>
}) {
  const t = useTranslations('bingo')
  const gridSize = parseInt(game.gridSize?.split('x')[0] || '3')
  const totalCells = gridSize * gridSize
  const teams: Team[] = game.teams || []
  const prevStatusRef = useRef(game.gameStatus)
  const rematchInitiatedByMe = useRef(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rematchDismissed, setRematchDismissed] = useState(false)
  const [rematchAcceptLoading, setRematchAcceptLoading] = useState(false)
  const [showEndOverlay, setShowEndOverlay] = useState(false)

  const winnerTeamIndex: number | null = game.winnerTeam ?? null
  const winnerTeam = winnerTeamIndex != null ? teams[winnerTeamIndex] : null

  // Live timer
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!game.startedAt) return
    const start = new Date(game.startedAt).getTime()

    const tick = () => {
      const end = game.completedAt ? new Date(game.completedAt).getTime() : Date.now()
      const diff = Math.max(0, Math.floor((end - start) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`,
      )
    }
    tick()
    if (game.gameStatus === 'in_progress') {
      const interval = setInterval(tick, 1000)
      return () => clearInterval(interval)
    }
  }, [game.startedAt, game.completedAt, game.gameStatus])

  // Show game-end overlay when status transitions to completed/cancelled
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = game.gameStatus

    if (prev === 'in_progress' && (game.gameStatus === 'completed' || game.gameStatus === 'cancelled')) {
      setShowEndOverlay(true)
    }
  }, [game.gameStatus])

  // Surrender handler
  const handleSurrender = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/bingo/${gameId}/surrender`, { method: 'POST' })
    if (res.ok) {
      mutate()
    } else {
      const data = await res.json()
      toast.error(data.error || t('surrender.failed'))
    }
    setActionLoading(false)
  }

  // Rematch handler (for the button — initiator)
  const handleRematch = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/bingo/${gameId}/rematch`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.gameId) {
      rematchInitiatedByMe.current = true
      router.push(`/app/bingo/${data.gameId}`)
    } else {
      toast.error(data.error || t('rematch.failedToCreate'))
      setActionLoading(false)
    }
  }

  // Rematch popup: accept handler (for the receiver)
  const handleAcceptRematch = async () => {
    setRematchAcceptLoading(true)
    const res = await fetch(`/api/bingo/${gameId}/rematch`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.gameId) {
      router.push(`/app/bingo/${data.gameId}`)
    } else {
      toast.error(data.error || t('rematch.failedToJoin'))
      setRematchAcceptLoading(false)
    }
  }

  const showRematchPopup =
    !!game.rematchGameId &&
    game.isCurrentUserInGame &&
    !rematchDismissed &&
    !rematchInitiatedByMe.current &&
    (game.gameStatus === 'completed' || game.gameStatus === 'cancelled')

  const otherPlayers = teams.flatMap((t) => t.players || []).filter((p) => p.id !== game.currentUserId)
  const rematchInitiatorName = otherPlayers.length === 1 ? otherPlayers[0].ingameNick : null

  // For solo mode: split team[0] players into top (player1) and bottom (player2)
  const isSolo = game.mode === 'solo'
  const topBar = isSolo
    ? {
        ...teams[0],
        players: teams[0]?.players?.slice(0, 1) || [],
      }
    : teams[0]

  const bottomBar = isSolo
    ? {
        ...teams[0],
        players: teams[0]?.players?.slice(1, 2) || [],
        color: teams.length > 1 ? teams[1]?.color : 'blue',
      }
    : teams[1]

  // Determine winner/loser for overlay
  const myTeamIdx: number | null = game.currentUserTeamIndex
  const isWinner = winnerTeamIndex != null && myTeamIdx === winnerTeamIndex
  const isCancelled = game.gameStatus === 'cancelled'

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto overflow-hidden">
      {showEndOverlay && game.isCurrentUserInGame && (
        <GameEndOverlay
          isWinner={isWinner}
          isCancelled={isCancelled}
          winnerTeamName={winnerTeam?.teamName}
          onDismiss={() => setShowEndOverlay(false)}
        />
      )}
      <Dialog
        open={showRematchPopup}
        onOpenChange={(open) => {
          if (!open) setRematchDismissed(true)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('rematch.title')}
            </DialogTitle>
            <DialogDescription>
              {rematchInitiatorName
                ? t('rematch.descriptionNamed', { name: rematchInitiatorName })
                : t('rematch.descriptionGeneric')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRematchDismissed(true)}>
              {t('rematch.decline')}
            </Button>
            <Button onClick={handleAcceptRematch} disabled={rematchAcceptLoading}>
              {rematchAcceptLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('rematch.accept')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header row: title + timer + status */}
      <div className="flex items-center justify-between shrink-0 py-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate leading-tight">{game.title}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CategoryIcon
              category={game.category}
              iconName={game.categoryIcon}
              className="h-3 w-3"
            />
            <span>{getCategoryLabelUniversal(game.category)}</span>
            <span>&middot;</span>
            <span>{game.gridSize}</span>
            <span>&middot;</span>
            <span className="capitalize">{game.winCondition?.replace(/_/g, ' ')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {elapsed && (
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{elapsed}</span>
          )}
          <StatusBadge status={game.gameStatus} />
          {game.gameStatus === 'in_progress' && game.isCurrentUserInGame && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive h-7 px-2"
                  disabled={actionLoading}
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('surrender.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('surrender.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('surrender.keep')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSurrender}>{t('surrender.confirm')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {(game.gameStatus === 'completed' || game.gameStatus === 'cancelled') &&
            game.isCurrentUserInGame && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={handleRematch}
                disabled={actionLoading}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('rematch.button')}
              </Button>
            )}
        </div>
      </div>

      {/* Victory banner */}
      {game.gameStatus === 'completed' && winnerTeam && (
        <div className="rounded-lg px-3 py-1.5 text-center border shrink-0 mb-1 bg-primary/10 border-primary/30">
          <p className="text-base font-bold text-primary">{t('result.winner', { team: winnerTeam.name })}</p>
        </div>
      )}

      {/* Cancelled */}
      {game.gameStatus === 'cancelled' && (
        <div className="rounded-lg px-3 py-1.5 text-center border border-muted bg-muted/30 shrink-0 mb-1">
          <p className="text-base font-bold text-muted-foreground">{t('result.cancelled')}</p>
        </div>
      )}

      {/* Top player bar */}
      <div className="shrink-0">
        {topBar && (
          <GamePlayerBar
            team={topBar}
            totalCells={totalCells}
            isWinner={winnerTeamIndex === 0 || (isSolo && winnerTeamIndex === 0)}
            label={isSolo ? t('team.playerOne') : undefined}
            creatorId={game.createdBy?.id}
          />
        )}
      </div>

      {/* Bingo Grid — fills remaining space */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        <BingoGrid
          size={gridSize}
          maps={game.maps || []}
          teams={teams}
          winnerTeamIndex={winnerTeamIndex}
          winningCells={game.winningCells}
          gameStatus={game.gameStatus}
        />
      </div>

      {/* Bottom player bar */}
      <div className="shrink-0">
        {bottomBar && (
          <GamePlayerBar
            team={bottomBar}
            totalCells={totalCells}
            isWinner={isSolo ? winnerTeamIndex === 0 : winnerTeamIndex === 1}
            label={isSolo ? t('team.playerTwo') : undefined}
            creatorId={game.createdBy?.id}
          />
        )}
      </div>
    </div>
  )
}
