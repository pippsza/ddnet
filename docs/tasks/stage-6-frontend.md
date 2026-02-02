# Stage 6: Frontend Pages

## Overview
Все страницы приложения с использованием shadcn sidebar-07, SWR для данных, и компонентами.

## Layout Setup

### Установить Sidebar
```bash
npx shadcn@latest add sidebar-07
```

### App Layout Structure

```
src/app/(frontend)/
├── layout.tsx              # Main layout with sidebar
├── page.tsx                # Landing/Home
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── verify/page.tsx
├── dashboard/page.tsx      # User dashboard
├── players/
│   ├── page.tsx            # Search + leaderboard
│   └── [id]/page.tsx       # Player profile
├── friends/
│   ├── page.tsx            # Friends list + online
│   └── chat/[id]/page.tsx  # Chat with friend
├── bingo/
│   ├── page.tsx            # Lobby + public games
│   ├── create/page.tsx     # Create bingo
│   └── [id]/page.tsx       # Bingo game page
├── race/
│   ├── page.tsx            # Lobby
│   ├── create/page.tsx
│   └── [id]/page.tsx       # Race page
├── settings/page.tsx       # User settings
└── admin/
    ├── page.tsx            # Admin dashboard
    └── bots/page.tsx       # Bot management
```

## Pages

### 6.1 App Layout with Sidebar

**Файл:** `src/app/(frontend)/layout.tsx`

```tsx
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session.user) {
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <main className="flex-1">
        <header className="flex items-center justify-between p-4 border-b">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
```

**Файл:** `src/components/layout/AppSidebar.tsx`

```tsx
'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import {
  Home,
  LayoutDashboard,
  Users,
  UserPlus,
  Grid3X3,
  Trophy,
  Settings,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TeeAvatar } from '@/components/tee/TeeAvatar'

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Players', url: '/players', icon: Users },
  { title: 'Friends', url: '/friends', icon: UserPlus },
  { title: 'Bingo', url: '/bingo', icon: Grid3X3 },
  { title: 'Race', url: '/race', icon: Trophy },
  { title: 'Settings', url: '/settings', icon: Settings },
]

export function AppSidebar({ user }: { user: any }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">DDNet Bingo</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.roles === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <TeeAvatar
            skinUrl={user.skinUrl}
            bodyColor={user.bodyColor}
            feetColor={user.feetColor}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.roles}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

### 6.2 Dashboard Page

**Файл:** `src/app/(frontend)/dashboard/page.tsx`

```tsx
'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeeAvatar } from '@/components/tee/TeeAvatar'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const { data: user } = useSWR('/api/users/me', fetcher)
  const { data: ddnetStats } = useSWR(
    user?.name ? `/api/ddnet/player/${user.name}` : null,
    fetcher
  )
  const { data: gameStats } = useSWR('/api/stats/my', fetcher)

  return (
    <div className="space-y-6">
      {/* User Card */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <TeeAvatar
            skinUrl={ddnetStats?.skin?.url}
            bodyColor={ddnetStats?.skin?.bodyColor}
            feetColor={ddnetStats?.skin?.feetColor}
            size="xl"
          />
          <div>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-muted-foreground">
              DDNet Points: {ddnetStats?.points || 0}
            </p>
            {user?.isSystemVerified && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded">
                Verified
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Bingo Games" value={gameStats?.bingo?.total || 0} />
        <StatCard title="Bingo Wins" value={gameStats?.bingo?.wins || 0} />
        <StatCard title="Race Games" value={gameStats?.race?.total || 0} />
        <StatCard title="Race Wins" value={gameStats?.race?.wins || 0} />
      </div>

      {/* DDNet Stats */}
      <Card>
        <CardHeader>
          <CardTitle>DDNet Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ddnetStats?.serverTypes?.map((st: any) => (
              <div key={st.type} className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{st.type}</p>
                <p className="text-xl font-bold">{st.points} pts</p>
                <p className="text-xs">{st.completedMaps} maps</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          {gameStats?.recentGames?.map((game: any) => (
            <div
              key={game.id}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div>
                <p className="font-medium">{game.title}</p>
                <p className="text-sm text-muted-foreground">
                  {game.type} · {new Date(game.completedAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  game.isWinner
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {game.isWinner ? 'Won' : 'Lost'}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
```

### 6.3 Bingo Game Page

**Файл:** `src/app/(frontend)/bingo/[id]/page.tsx`

```tsx
'use client'

import { use } from 'react'
import useSWR from 'swr'
import { BingoGrid } from '@/components/bingo/BingoGrid'
import { PlayerCard } from '@/components/bingo/PlayerCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function BingoGamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { data: game, error } = useSWR(`/api/bingo/${id}`, fetcher, {
    refreshInterval: game?.gameStatus === 'in_progress' ? 3000 : 0,
  })

  if (error) return <div>Error loading game</div>
  if (!game) return <div>Loading...</div>

  const gridSize = parseInt(game.gridSize.split('x')[0])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <p className="text-muted-foreground">
            {game.category} · {game.gridSize} · {game.winCondition}
          </p>
        </div>
        <Badge
          variant={
            game.gameStatus === 'in_progress'
              ? 'default'
              : game.gameStatus === 'completed'
              ? 'secondary'
              : 'outline'
          }
        >
          {game.gameStatus}
        </Badge>
      </div>

      {/* Team 1 Card (Top) */}
      {game.teams[0] && (
        <PlayerCard
          team={game.teams[0]}
          isWinner={game.winnerTeam === 0}
        />
      )}

      {/* Bingo Grid */}
      <BingoGrid
        size={gridSize}
        maps={game.maps}
        teams={game.teams}
      />

      {/* Team 2 Card (Bottom) - for Team mode */}
      {game.mode === 'team' && game.teams[1] && (
        <PlayerCard
          team={game.teams[1]}
          isWinner={game.winnerTeam === 1}
        />
      )}

      {/* Game Info */}
      {game.gameStatus === 'in_progress' && game.startedAt && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Started: {new Date(game.startedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {game.gameStatus === 'completed' && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">
              {game.mode === 'team'
                ? `${game.teams[game.winnerTeam].teamName} Wins!`
                : 'Game Completed!'}
            </p>
            <p className="text-sm text-muted-foreground">
              Duration: {game.duration} minutes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 6.4 Bingo Grid Component

**Файл:** `src/components/bingo/BingoGrid.tsx`

```tsx
interface BingoGridProps {
  size: number
  maps: { mapName: string; position: number }[]
  teams: {
    color: string
    completedCells: { cellPosition: number }[]
  }[]
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
}

export function BingoGrid({ size, maps, teams }: BingoGridProps) {
  // Create map lookup
  const mapLookup = new Map<number, string>()
  maps.forEach(m => mapLookup.set(m.position, m.mapName))

  // Create completion lookup
  const team1Cells = new Set(teams[0]?.completedCells?.map(c => c.cellPosition) || [])
  const team2Cells = new Set(teams[1]?.completedCells?.map(c => c.cellPosition) || [])

  const getCellClasses = (position: number) => {
    const isTeam1 = team1Cells.has(position)
    const isTeam2 = team2Cells.has(position)

    if (isTeam1 && isTeam2) {
      // Both teams - split diagonally
      return 'bingo-cell-split'
    }
    if (isTeam1) {
      return colorClasses[teams[0].color] + ' text-white'
    }
    if (isTeam2) {
      return colorClasses[teams[1].color] + ' text-white'
    }
    return 'bg-muted'
  }

  return (
    <div
      className="grid gap-2 w-full max-w-2xl mx-auto"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: size * size }, (_, i) => (
        <div
          key={i}
          className={`
            aspect-square flex items-center justify-center
            rounded-lg p-2 text-center text-xs font-medium
            transition-colors duration-300
            ${getCellClasses(i)}
          `}
        >
          <span className="truncate">{mapLookup.get(i) || '?'}</span>
        </div>
      ))}
    </div>
  )
}
```

### 6.5 Player Card Component

**Файл:** `src/components/bingo/PlayerCard.tsx`

```tsx
import { TeeAvatar } from '@/components/tee/TeeAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface PlayerCardProps {
  team: {
    teamName: string
    color: string
    players: {
      user: {
        name: string
        skinUrl?: string
        bodyColor?: number
        feetColor?: number
      }
    }[]
    completedCells: any[]
    teamStatus: string
  }
  isWinner?: boolean
}

export function PlayerCard({ team, isWinner }: PlayerCardProps) {
  return (
    <Card className={isWinner ? 'border-green-500 border-2' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-semibold">{team.teamName}</span>
          {team.players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <TeeAvatar
                skinUrl={p.user.skinUrl}
                bodyColor={p.user.bodyColor}
                feetColor={p.user.feetColor}
                size="sm"
              />
              <span className="text-sm">{p.user.name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">
            {team.completedCells?.length || 0} cells
          </span>
          {isWinner && (
            <Badge variant="default" className="bg-green-500">
              Winner
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6.6 Players Page with Leaderboard

**Файл:** `src/app/(frontend)/players/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TeeAvatar } from '@/components/tee/TeeAvatar'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PlayersPage() {
  const [search, setSearch] = useState('')
  const { data: searchResults } = useSWR(
    search.length >= 2 ? `/api/players/search?q=${search}` : null,
    fetcher
  )
  const { data: leaderboard } = useSWR('/api/leaderboard', fetcher)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Players</h1>

      {/* Search */}
      <Input
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {search.length >= 2 && searchResults && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.docs?.map((player: any) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="flex items-center gap-4 p-3 hover:bg-muted rounded-lg"
              >
                <TeeAvatar
                  skinUrl={player.skinUrl}
                  bodyColor={player.bodyColor}
                  feetColor={player.feetColor}
                  size="sm"
                />
                <span>{player.name}</span>
              </Link>
            ))}
            {searchResults.docs?.length === 0 && (
              <p className="text-muted-foreground">No players found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Tabs defaultValue="bingo">
        <TabsList>
          <TabsTrigger value="bingo">Bingo</TabsTrigger>
          <TabsTrigger value="race">Race</TabsTrigger>
        </TabsList>

        <TabsContent value="bingo">
          <LeaderboardTable data={leaderboard?.bingo} />
        </TabsContent>

        <TabsContent value="race">
          <LeaderboardTable data={leaderboard?.race} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LeaderboardTable({ data }: { data: any[] }) {
  if (!data) return <div>Loading...</div>

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">Player</th>
              <th className="p-4 text-left">Wins</th>
              <th className="p-4 text-left">Games</th>
              <th className="p-4 text-left">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((player, index) => (
              <tr key={player.id} className="border-b last:border-0">
                <td className="p-4 font-bold">{index + 1}</td>
                <td className="p-4">
                  <Link
                    href={`/players/${player.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <TeeAvatar
                      skinUrl={player.skinUrl}
                      size="sm"
                    />
                    {player.name}
                  </Link>
                </td>
                <td className="p-4">{player.wins}</td>
                <td className="p-4">{player.totalGames}</td>
                <td className="p-4">{player.winRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
```

### 6.7 Friends & Online Page

**Файл:** `src/app/(frontend)/friends/page.tsx`

```tsx
'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeeAvatar } from '@/components/tee/TeeAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function FriendsPage() {
  const { data: friends } = useSWR('/api/friends', fetcher)
  const { data: onlineStatus } = useSWR('/api/friends/online', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  const onlineFriends = friends?.filter((f: any) =>
    onlineStatus?.find((o: any) => o.name === f.user.name && o.online)
  )

  const offlineFriends = friends?.filter((f: any) =>
    !onlineStatus?.find((o: any) => o.name === f.user.name && o.online)
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      {/* Online Now */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Online Now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {onlineFriends?.map((friend: any) => {
            const status = onlineStatus?.find(
              (o: any) => o.name === friend.user.name
            )
            return (
              <div
                key={friend.user.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <TeeAvatar
                    skinUrl={friend.user.skinUrl}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium">{friend.user.name}</p>
                    {status?.server && (
                      <p className="text-xs text-muted-foreground">
                        {status.server.name} - {status.server.map}
                      </p>
                    )}
                  </div>
                </div>
                <Link href={`/friends/chat/${friend.user.id}`}>
                  <Button size="sm">Chat</Button>
                </Link>
              </div>
            )
          })}
          {(!onlineFriends || onlineFriends.length === 0) && (
            <p className="text-muted-foreground text-center py-4">
              No friends online
            </p>
          )}
        </CardContent>
      </Card>

      {/* Offline Friends */}
      <Card>
        <CardHeader>
          <CardTitle>Offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {offlineFriends?.map((friend: any) => (
            <div
              key={friend.user.id}
              className="flex items-center gap-3 p-3 opacity-50"
            >
              <TeeAvatar
                skinUrl={friend.user.skinUrl}
                size="sm"
              />
              <span>{friend.user.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

## Checklist

- [ ] Установить sidebar: `npx shadcn@latest add sidebar-07`
- [ ] Создать layout с sidebar
- [ ] Создать AppSidebar компонент
- [ ] Создать Dashboard страницу
- [ ] Создать Bingo Game страницу
- [ ] Создать BingoGrid компонент
- [ ] Создать PlayerCard компонент
- [ ] Создать Players страницу с поиском и лидербордом
- [ ] Создать Friends страницу
- [ ] Создать Chat страницу
- [ ] Создать Race страницу
- [ ] Создать Settings страницу
- [ ] Создать Create Bingo страницу
- [ ] Создать Create Race страницу
- [ ] Адаптивный дизайн для всех страниц
