'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { DashboardSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DashboardPage() {
  const { data: user, isLoading } = useSWR('/api/users/me', fetcher)

  if (isLoading) return <DashboardSkeleton />

  const userData = user?.user
  const skinUrl = userData?.ingameStats?.skin?.name
    ? getDDNetSkinUrl(userData.ingameStats.skin.name)
    : undefined

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative">
            <TeeAvatarWithFallback
              skinUrl={skinUrl}
              bodyColor={userData?.ingameStats?.skin?.colorBody}
              feetColor={userData?.ingameStats?.skin?.colorFeet}
              size="xl"
              lookAtCursor
              useCustomColors={!!(userData?.ingameStats?.skin?.colorBody || userData?.ingameStats?.skin?.colorFeet)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{userData?.username || 'Unknown'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {userData?.isSystemVerified && (
                <StatusBadge status="verified" />
              )}
              <span className="text-sm text-muted-foreground capitalize">{userData?.roles}</span>
            </div>
            {userData?.ingameStats?.points !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {userData.ingameStats.points.toLocaleString()} DDNet points
                {userData.ingameStats.rank && (
                  <span className="opacity-60"> &middot; Rank #{userData.ingameStats.rank}</span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="DDNet Points"
          value={userData?.ingameStats?.points?.toLocaleString() || '—'}
          subtitle={userData?.ingameStats?.rank ? `Rank #${userData.ingameStats.rank}` : undefined}
        />
        <StatCard
          title="Bingo Games"
          value={userData?.bingo?.totalGamesPlayed || 0}
          subtitle={`${userData?.bingo?.totalGamesWon || 0} won`}
        />
        <StatCard
          title="Win Rate"
          value={`${userData?.bingo?.winRate || 0}%`}
          subtitle="Bingo"
        />
        <StatCard
          title="Friends"
          value={userData?.friend?.length || 0}
        />
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">B</span>
              Bingo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create or join a bingo game to compete on DDNet maps
            </p>
            <div className="flex gap-2">
              <Link href="/app/bingo/create" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Game
              </Link>
              <Link href="/app/bingo" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Browse Lobby
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">R</span>
              Race
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Race against other players on DDNet servers
            </p>
            <div className="flex gap-2">
              <Link href="/app/race/create" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Race
              </Link>
              <Link href="/app/race" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Browse Lobby
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
