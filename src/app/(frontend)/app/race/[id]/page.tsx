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
  LogIn,
  LogOut,
  Loader2,
  Settings2,
  Map,
  Swords,
  Flag,
  RotateCcw,
  Server,
} from 'lucide-react'
import { RacePathGame } from '@/components/race/RacePathGame'
import { RacePathPreview } from '@/components/race/RacePathPreview'
import { RaceStartCountdown } from '@/components/race/RaceStartCountdown'
import { CategoryModeSelector } from '@/components/race/CategoryModeSelector'
import { GamePlayerBar } from '@/components/bingo/GamePlayerBar'
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
import { GamePageSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { FriendInviteSearch } from '@/components/bingo/FriendInviteSearch'
import { CategorySelect } from '@/components/CategorySelect'
import { CategoryIcon } from '@/components/bingo/CategoryIcon'
import { ModeSelector } from '@/components/bingo/ModePreview'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  username: string
  points?: number
  skin?: { name: string; colorBody: number; colorFeet: number } | null
  isReady: boolean
  roles?: string
}

interface PendingInvite {
  id: string
  username: string
  skin?: { name: string; colorBody: number; colorFeet: number } | null
}

interface Team {
  index: number
  name: string
  color: string
  status: string
  score: number
  players: Player[]
  pendingInvites?: PendingInvite[]
  completedSteps?: { position: number; completedAt?: string; finishTime?: number }[]
}

export default function RaceGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [countdownDone, setCountdownDone] = useState(false)

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
  } = useSWR(`/api/race/${id}`, fetcher, {
    refreshInterval: 3000,
  })

  if (error) return <div className="p-8 text-center text-red-500">Error loading race</div>
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

  if (!countdownDone && !skipCountdown && game.gameStatus === 'in_progress') {
    return (
      <RaceStartCountdown
        pathLength={game.pathLength}
        maps={game.maps || []}
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
  mutate: (data?: any, opts?: boolean | { revalidate?: boolean }) => any
  router: ReturnType<typeof useRouter>
  inviteTeamIndex?: number
}) {
  const [actionLoading, setActionLoading] = useState(false)
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set())
  const [settingsError, setSettingsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings')

  // Settings state (creator only)
  const [title, setTitle] = useState(game.title)
  const [category, setCategory] = useState(game.category)
  const [categoryMode, setCategoryMode] = useState<'selected' | 'free'>(
    game.categoryMode || 'selected',
  )
  const [pathLength, setPathLength] = useState(game.pathLength || 5)
  const [mode, setMode] = useState<'solo' | 'team'>(game.mode)
  const [diffMin, setDiffMin] = useState(game.difficultyRange?.min ?? 0)
  const [diffMax, setDiffMax] = useState(game.difficultyRange?.max ?? 5)
  const [isPublic, setIsPublic] = useState(game.isPublic)
  const [serverAddress, setServerAddress] = useState(() => {
    const ip = game.server?.ip || ''
    const port = game.server?.port || 8303
    return ip ? `${ip}:${port}` : ''
  })
  const [serverName, setServerName] = useState(game.server?.name || '')
  const [availableMapCount, setAvailableMapCount] = useState<number | null>(null)

  // Batched settings updates
  const pendingRef = useRef<Record<string, any>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathLengthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Last confirmed server state for revert on error
  const confirmedRef = useRef({
    title: game.title,
    category: game.category,
    categoryMode: game.categoryMode || 'selected',
    pathLength: game.pathLength || 5,
    mode: game.mode as 'solo' | 'team',
    diffMin: game.difficultyRange?.min ?? 0,
    diffMax: game.difficultyRange?.max ?? 5,
    isPublic: game.isPublic,
    serverAddress: (() => {
      const ip = game.server?.ip || ''
      const port = game.server?.port || 8303
      return ip ? `${ip}:${port}` : ''
    })(),
    serverName: game.server?.name || '',
  })

  const serverTeams: Team[] = game.teams || []
  const isCreator = game.isCreator
  const isInGame = game.isCurrentUserInGame
  const myTeamIndex: number | null = game.currentUserTeamIndex

  // Optimistic teams: show/hide Team 2 immediately on mode switch
  const teams: Team[] = (() => {
    if (!isCreator) return serverTeams
    if (mode === 'team' && serverTeams.length === 1) {
      return [
        serverTeams[0],
        {
          index: 1,
          name: 'Team 2',
          color: 'blue',
          status: 'not_ready',
          score: 0,
          players: [],
          completedSteps: [],
        },
      ]
    }
    if (mode === 'solo' && serverTeams.length === 2) {
      return [serverTeams[0]]
    }
    return serverTeams
  })()

  // Creator is always considered ready
  const hasServerIp =
    !!(serverAddress.includes(':') ? serverAddress.split(':')[0] : serverAddress) ||
    !!game.server?.ip
  const canStart = (() => {
    if (!isCreator) return false
    if (!hasServerIp) return false
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
        case 'categoryMode':
          setCategoryMode(c.categoryMode as 'selected' | 'free')
          break
        case 'pathLength':
          setPathLength(c.pathLength)
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
        case 'serverIp':
        case 'serverPort':
          setServerAddress(c.serverAddress)
          break
        case 'serverName':
          setServerName(c.serverName)
          break
      }
    }
  }, [])

  // Build optimistic game data from a settings patch
  const buildOptimisticGame = useCallback((prev: any, patch: Record<string, any>) => {
    if (!prev) return prev
    const next = { ...prev }
    if ('title' in patch) next.title = patch.title
    if ('category' in patch) next.category = patch.category
    if ('categoryMode' in patch) next.categoryMode = patch.categoryMode
    if ('pathLength' in patch) next.pathLength = patch.pathLength
    if ('mode' in patch) next.mode = patch.mode
    if ('isPublic' in patch) next.isPublic = patch.isPublic
    if ('difficultyMin' in patch || 'difficultyMax' in patch) {
      next.difficultyRange = {
        ...prev.difficultyRange,
        ...(patch.difficultyMin !== undefined && { min: patch.difficultyMin }),
        ...(patch.difficultyMax !== undefined && { max: patch.difficultyMax }),
      }
    }
    if ('serverIp' in patch || 'serverPort' in patch || 'serverName' in patch) {
      next.server = {
        ...prev.server,
        ...(patch.serverIp !== undefined && { ip: patch.serverIp }),
        ...(patch.serverPort !== undefined && { port: patch.serverPort }),
        ...(patch.serverName !== undefined && { name: patch.serverName }),
      }
    }
    return next
  }, [])

  const flushSettings = useCallback(async () => {
    const batch = { ...pendingRef.current }
    pendingRef.current = {}
    if (Object.keys(batch).length === 0) return

    const batchKeys = Object.keys(batch)
    setSettingsError('')

    // Optimistic SWR update — prevents polling from reverting local state
    mutate((prev: any) => buildOptimisticGame(prev, batch), { revalidate: false })

    try {
      const res = await fetch(`/api/race/${gameId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!res.ok) {
        const data = await res.json()
        setSettingsError(data.error || 'Failed to update')
        setTimeout(() => setSettingsError(''), 4000)
        revertFromServer(batchKeys)
        mutate() // revalidate to get server truth
      } else {
        for (const key of batchKeys) {
          if (key === 'title') confirmedRef.current.title = batch.title
          else if (key === 'category') confirmedRef.current.category = batch.category
          else if (key === 'categoryMode') confirmedRef.current.categoryMode = batch.categoryMode
          else if (key === 'pathLength') confirmedRef.current.pathLength = batch.pathLength
          else if (key === 'mode') confirmedRef.current.mode = batch.mode
          else if (key === 'difficultyMin') confirmedRef.current.diffMin = batch.difficultyMin
          else if (key === 'difficultyMax') confirmedRef.current.diffMax = batch.difficultyMax
          else if (key === 'isPublic') confirmedRef.current.isPublic = batch.isPublic
          else if (key === 'serverIp' || key === 'serverPort') {
            const ip = batch.serverIp ?? confirmedRef.current.serverAddress.split(':')[0] ?? ''
            const port =
              batch.serverPort ?? confirmedRef.current.serverAddress.split(':')[1] ?? '8303'
            confirmedRef.current.serverAddress = `${ip}:${port}`
          } else if (key === 'serverName') confirmedRef.current.serverName = batch.serverName
        }
        mutate() // revalidate to pick up server-side changes (e.g. regenerated maps)
      }
    } catch {
      setSettingsError('Failed to save settings')
      setTimeout(() => setSettingsError(''), 4000)
      revertFromServer(batchKeys)
      mutate()
    } finally {
      setSavingFields((prev) => {
        const next = new Set(prev)
        for (const key of batchKeys) next.delete(key)
        return next
      })
    }
  }, [gameId, mutate, revertFromServer, buildOptimisticGame])

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
    let newPathLength = pathLength
    if (categoryMode === 'selected' && mapCount !== null && pathLength > mapCount) {
      newPathLength = Math.max(3, mapCount)
      setPathLength(newPathLength)
    }
    updateSettings({ category: val, pathLength: newPathLength })
  }

  const handleCategoryModeChange = (cm: 'selected' | 'free') => {
    setCategoryMode(cm)
    updateSettings({ categoryMode: cm })
  }

  const handlePathLengthChange = (val: number) => {
    const max = categoryMode === 'free' ? 20 : (availableMapCount ?? 20)
    const clamped = Math.max(3, Math.min(max, val))
    setPathLength(clamped)
    if (pathLengthTimeoutRef.current) clearTimeout(pathLengthTimeoutRef.current)
    pathLengthTimeoutRef.current = setTimeout(() => {
      updateSettings({ pathLength: clamped })
    }, 1000)
  }

  const handleModeChange = (m: 'solo' | 'team') => {
    if (m === 'solo' && serverTeams.length > 1) {
      const team2 = serverTeams[1]
      const hasPlayers = team2.players.length > 0
      const hasPending = (team2.pendingInvites?.length || 0) > 0
      if (hasPlayers || hasPending) {
        toast.error('Cannot switch to solo while Team 2 has players or pending invites')
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

  const handleServerAddressChange = (address: string) => {
    setServerAddress(address)
    if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current)
    serverTimeoutRef.current = setTimeout(() => {
      const [ip, portStr] = address.split(':')
      const port = portStr ? parseInt(portStr, 10) : 8303
      updateSettings({ serverIp: ip || '', serverPort: port })
    }, 500)
  }

  const handleServerNameChange = (name: string) => {
    setServerName(name)
    if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current)
    serverTimeoutRef.current = setTimeout(() => {
      updateSettings({ serverName: name })
    }, 500)
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleReady = async () => {
    setActionLoading(true)
    await fetch(`/api/race/${gameId}/ready`, { method: 'POST' })
    mutate()
    setActionLoading(false)
  }

  const handleStart = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/race/${gameId}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to start race')
      }
    } catch {
      toast.error('Failed to start race')
    } finally {
      mutate()
      setActionLoading(false)
    }
  }

  const handleJoin = async () => {
    setActionLoading(true)
    await fetch(`/api/race/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIndex: inviteTeamIndex }),
    })
    mutate()
    setActionLoading(false)
  }

  const handleCancel = async () => {
    await fetch(`/api/race/${gameId}/cancel`, { method: 'POST' })
    router.push('/app/race')
  }

  const handleLeave = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/race/${gameId}/leave`, { method: 'POST' })
    if (res.ok) {
      router.push('/app/race')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to leave game')
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
      const res = await fetch(`/api/race/${gameId}/switch-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTeamIndex }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to switch team')
      }
    } catch {
      toast.error('Failed to switch team')
    } finally {
      mutate()
      setActionLoading(false)
    }
  }

  // ─── Settings section ─────────────────────────────────────────────────────

  const settingsContent = (
    <div className="space-y-4">
      {/* Title */}
      {isCreator ? (
        <div>
          <Label htmlFor="title">Race Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="My Race"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{game.title}</h1>
          <StatusBadge status={game.gameStatus} />
        </div>
      )}

      {/* Category (hidden in free mode) */}
      {(isCreator ? categoryMode : game.categoryMode) !== 'free' &&
        (isCreator ? (
          <div>
            <Label>Category</Label>
            <CategorySelect
              name="category"
              value={category}
              onValueChange={handleCategoryChange}
              disabled={savingFields.has('category')}
            />
          </div>
        ) : (
          <div className="text-sm flex items-center gap-1.5">
            <span className="text-muted-foreground">Category:</span>
            <CategoryIcon
              category={game.category}
              iconName={game.categoryIcon}
              className="h-4 w-4 text-muted-foreground"
            />
            <span className="font-medium capitalize">{game.category}</span>
          </div>
        ))}

      {/* Path Length (read-only for non-creator; interactive preview controls it for creator) */}
      {!isCreator && (
        <div className="text-sm">
          <span className="text-muted-foreground">Path Length:</span>{' '}
          <span className="font-medium">{game.pathLength} steps</span>
        </div>
      )}

      {/* Difficulty (hidden in free mode) */}
      {(isCreator ? categoryMode : game.categoryMode) !== 'free' &&
        (isCreator ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Difficulty</Label>
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
              <Label>Max Difficulty</Label>
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
            <span className="text-muted-foreground">Difficulty:</span>{' '}
            <span className="font-medium">
              {game.difficultyRange?.min ?? 0} – {game.difficultyRange?.max ?? 5} stars
            </span>
          </div>
        ))}

      {/* Server */}
      {isCreator ? (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Server
          </Label>
          <Input
            value={serverAddress}
            onChange={(e) => handleServerAddressChange(e.target.value)}
            placeholder="127.0.0.1:8303"
          />
          <Input
            value={serverName}
            onChange={(e) => handleServerNameChange(e.target.value)}
            placeholder="Server name (optional)"
          />
        </div>
      ) : (
        <div className="text-sm flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Server:</span>{' '}
          <span className="font-medium">
            {game.server?.name || `${game.server?.ip}:${game.server?.port}`}
          </span>
        </div>
      )}

      {/* Mode */}
      {isCreator ? (
        <div>
          <Label>Mode</Label>
          <ModeSelector
            mode={mode}
            onModeChange={handleModeChange}
            disabled={savingFields.has('mode')}
          />
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">Mode:</span>{' '}
          <span className="font-medium capitalize">{game.mode}</span>
        </div>
      )}

      {/* Public toggle */}
      {isCreator ? (
        <div className="flex items-center gap-2">
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={handlePublicToggle}
            disabled={savingFields.has('isPublic')}
          />
          <Label htmlFor="isPublic" className="mb-0">
            Public Race
          </Label>
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-muted-foreground">Visibility:</span>{' '}
          <span className="font-medium">{game.isPublic ? 'Public' : 'Private'}</span>
        </div>
      )}

      {/* Invite code */}
      {game.inviteCode && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Invite Code:</span>
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
      {(isCreator ? mode : game.mode) === 'team' ? (
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

  // ─── Path preview ─────────────────────────────────────────────────────────

  const effectiveCategoryMode = isCreator ? categoryMode : game.categoryMode
  const effectiveMaxLength = effectiveCategoryMode === 'free' ? 20 : (availableMapCount ?? 20)

  const categoryModeContent = isCreator ? (
    <div className="w-full max-w-sm">
      <Label>Category Mode</Label>
      <CategoryModeSelector
        mode={categoryMode}
        onModeChange={handleCategoryModeChange}
        disabled={savingFields.has('categoryMode')}
      />
    </div>
  ) : (
    <div className="text-sm">
      <span className="text-muted-foreground">Category Mode:</span>{' '}
      <span className="font-medium capitalize">{game.categoryMode}</span>
    </div>
  )

  const pathPreviewContent = (
    <div className="flex flex-col items-center gap-6 w-full">
      {categoryModeContent}
      {isCreator ? (
        <RacePathPreview
          pathLength={pathLength}
          categoryMode={categoryMode}
          onPathLengthChange={handlePathLengthChange}
          minLength={3}
          maxLength={effectiveMaxLength}
          disabled={savingFields.has('pathLength') || savingFields.has('category')}
        />
      ) : (
        <div className="pointer-events-none opacity-80">
          <RacePathPreview
            pathLength={game.pathLength}
            categoryMode={game.categoryMode}
          />
        </div>
      )}
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
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
            Back
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
                    <AlertDialogTitle>Cancel race?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the race for all players. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep playing</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Cancel race</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {!isInGame && (
              <Button size="sm" onClick={handleJoin} disabled={actionLoading}>
                <LogIn className="h-4 w-4 mr-1.5" />
                {actionLoading ? 'Joining...' : 'Join Race'}
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
                      <AlertDialogTitle>Leave race?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will be removed from the team. You can rejoin later if the race is still
                        open.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Stay</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
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
                  {actionLoading ? '...' : amReady ? 'Unready' : 'Ready'}
                </Button>
              </>
            )}
            {isCreator && (
              <>
                {!hasServerIp && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Set server IP to start
                  </span>
                )}
                <Button size="sm" onClick={handleStart} disabled={!canStart || actionLoading}>
                  <Play className="h-4 w-4 mr-1.5" />
                  {actionLoading ? 'Starting...' : 'Start Race'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: two columns */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 pt-4 flex-1 min-h-0">
        <div className="min-h-0 overflow-y-auto pr-2">{settingsContent}</div>
        <div className="min-h-0 flex items-center justify-center">{pathPreviewContent}</div>
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
          {pathPreviewContent}
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
              <Map className="h-4 w-4" />
              Preview
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4" />
              Settings
            </>
          )}
        </Button>
      </div>
    </div>
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
  const [inviting, setInviting] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
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

    const optimisticEntry: PendingInvite = {
      id: player.id,
      username: player.name,
      skin: player.skin || null,
    }
    setOptimisticPending((prev) => [...prev, optimisticEntry])
    setInviting(false)
    setInviteLoading(true)

    try {
      const res = await fetch(`/api/race/${gameId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, teamIndex: team.index }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOptimisticPending((prev) => prev.filter((p) => p.id !== player.id))
        toast.error(data.error || 'Failed to send invite')
      }
    } catch {
      setOptimisticPending((prev) => prev.filter((p) => p.id !== player.id))
      toast.error('Failed to send invite')
    } finally {
      setInviteLoading(false)
      mutate()
    }
  }

  const handleCancelInvite = async (playerId: string) => {
    const removed = optimisticPending.find((p) => p.id === playerId)
    setOptimisticPending((prev) => prev.filter((p) => p.id !== playerId))

    try {
      const res = await fetch(`/api/race/${gameId}/invite`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamIndex: team.index }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (removed) setOptimisticPending((prev) => [...prev, removed])
        toast.error(data.error || 'Failed to cancel invite')
      }
    } catch {
      if (removed) setOptimisticPending((prev) => [...prev, removed])
      toast.error('Failed to cancel invite')
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
                  <span className="text-sm font-medium truncate block">{player.username}</span>
                  {player.points !== undefined && player.points > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {player.points.toLocaleString()} pts
                    </span>
                  )}
                </div>
                {player.id === creatorId ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-muted-foreground/30 text-muted-foreground"
                  >
                    Host
                  </Badge>
                ) : player.isReady ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-green-500/50 text-green-600 dark:text-green-400"
                  >
                    Joined
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
                  <span className="text-sm font-medium truncate block">{invite.username}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                >
                  Invited
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
                {isMyTeam ? 'Invite Teammate' : 'Invite Opponent'}
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
                Cancel
              </Button>
            </div>
          )}

          {/* Waiting slot */}
          {hasSpace && !canInvite && !onSwitchTeam && (
            <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-muted-foreground/20">
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>
              <span className="text-xs text-muted-foreground/50">Waiting for player...</span>
            </div>
          )}

          {/* Switch team button */}
          {isInGame && !isMyTeam && gameMode === 'team' && hasSpace && onSwitchTeam && (
            <button
              type="button"
              onClick={() => onSwitchTeam(team.index)}
              className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-primary/30 w-full text-left hover:bg-primary/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                <ArrowLeftRight className="h-3.5 w-3.5 text-primary/50" />
              </div>
              <span className="text-sm text-primary/70">Switch to this team</span>
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
  const teams: Team[] = game.teams || []
  const confettiFired = useRef(false)
  const [actionLoading, setActionLoading] = useState(false)

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

  // Fire confetti on game completion
  useEffect(() => {
    if (game.gameStatus !== 'completed' || confettiFired.current) return
    confettiFired.current = true

    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => {
        confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.3 } })
      }, 300)
      setTimeout(() => {
        confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.7 } })
      }, 600)
    })
  }, [game.gameStatus])

  // Surrender handler
  const handleSurrender = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/race/${gameId}/surrender`, { method: 'POST' })
    if (res.ok) {
      mutate()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to surrender')
    }
    setActionLoading(false)
  }

  // Rematch handler
  const handleRematch = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/race/${gameId}/rematch`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.gameId) {
      router.push(`/app/race/${data.gameId}`)
    } else {
      toast.error(data.error || 'Failed to create rematch')
      setActionLoading(false)
    }
  }

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

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto overflow-hidden">
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
            <span className="capitalize">{game.category}</span>
            <span>&middot;</span>
            <span>{game.pathLength} steps</span>
            <span>&middot;</span>
            <span className="capitalize">{game.categoryMode}</span>
          </p>
          {game.currentMap && game.gameStatus === 'in_progress' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Server className="h-3 w-3" />
              <span>
                Current: <strong>{game.currentMap}</strong>
              </span>
              <span>&middot;</span>
              <span>
                Step {(game.currentStep || 0) + 1}/{game.pathLength}
              </span>
            </p>
          )}
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
                  <AlertDialogTitle>Surrender?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your opponent will win the race. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep playing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSurrender}>Surrender</AlertDialogAction>
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
                Rematch
              </Button>
            )}
        </div>
      </div>

      {/* Victory banner */}
      {game.gameStatus === 'completed' && winnerTeam && (
        <div className="rounded-lg px-3 py-1.5 text-center border shrink-0 mb-1 bg-primary/10 border-primary/30">
          <p className="text-base font-bold text-primary">{winnerTeam.name} wins!</p>
        </div>
      )}

      {/* Cancelled */}
      {game.gameStatus === 'cancelled' && (
        <div className="rounded-lg px-3 py-1.5 text-center border border-muted bg-muted/30 shrink-0 mb-1">
          <p className="text-base font-bold text-muted-foreground">Race Cancelled</p>
        </div>
      )}

      {/* Top player bar */}
      <div className="shrink-0">
        {topBar && (
          <GamePlayerBar
            team={topBar}
            totalCells={game.pathLength}
            isWinner={winnerTeamIndex === 0 || (isSolo && winnerTeamIndex === 0)}
            label={isSolo ? 'Player 1' : undefined}
            creatorId={game.createdBy?.id}
            score={topBar.score}
          />
        )}
      </div>

      {/* Race Path — fills remaining space */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        <RacePathGame
          pathLength={game.pathLength}
          maps={game.maps || []}
          teams={teams.map((t) => ({
            color: t.color,
            score: t.score,
            completedSteps: t.completedSteps,
          }))}
          currentStep={game.currentStep || 0}
          winnerTeamIndex={winnerTeamIndex}
          gameStatus={game.gameStatus}
          categoryMode={game.categoryMode}
        />
      </div>

      {/* Bottom player bar */}
      <div className="shrink-0">
        {bottomBar && (
          <GamePlayerBar
            team={bottomBar}
            totalCells={game.pathLength}
            isWinner={
              isSolo
                ? winnerTeamIndex === 0 && teams[0]?.players?.length > 1
                : winnerTeamIndex === 1
            }
            label={isSolo ? 'Player 2' : undefined}
            creatorId={game.createdBy?.id}
            score={isSolo ? 0 : bottomBar.score}
          />
        )}
      </div>
    </div>
  )
}
