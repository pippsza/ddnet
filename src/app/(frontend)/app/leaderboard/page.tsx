'use client'

import { Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { LeaderboardSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { DDNET_CATEGORIES, getCategoryLabel } from '@/lib/ddnet-constants'
import { isPlatformOnline } from '@/lib/online-utils'
import { cn } from '@/lib/utils'
import { PageTransition, ScaleIn, FadeIn } from '@/components/ui/animations'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const BINGO_SORT_OPTIONS = [
  { value: 'wins', labelKey: 'sort.mostWins' as const },
  { value: 'winRate', labelKey: 'sort.bestWinRate' as const },
  { value: 'games', labelKey: 'sort.mostGames' as const },
  { value: 'maps', labelKey: 'sort.mostMaps' as const },
]

const RACE_SORT_OPTIONS = [
  { value: 'wins', labelKey: 'sort.mostWins' as const },
  { value: 'winRate', labelKey: 'sort.bestWinRate' as const },
  { value: 'games', labelKey: 'sort.mostGames' as const },
  { value: 'rounds', labelKey: 'sort.mostRoundsWon' as const },
]

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ['bg-amber-500', 'bg-gray-400', 'bg-amber-700']
    return (
      <span
        className={cn(
          colors[rank - 1],
          'text-white text-xs font-bold w-6 h-6 rounded-full inline-flex items-center justify-center',
        )}
      >
        {rank}
      </span>
    )
  }
  return <span className="text-sm text-muted-foreground font-mono w-6 text-center inline-block">#{rank}</span>
}

function LeaderboardContent() {
  const t = useTranslations('leaderboard')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = searchParams.get('tab') || 'bingo'
  const category = searchParams.get('category') || 'all'
  const sortBy = searchParams.get('sort') || 'wins'
  const { page, setPage, buildUrl } = usePagination({ defaultLimit: 20 })

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    params.delete('page') // Reset page on filter change
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setTab = (tab: string) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const sortOptions = activeTab === 'race' ? RACE_SORT_OPTIONS : BINGO_SORT_OPTIONS
  const apiUrl = `/api/leaderboard?type=${activeTab}&category=${category}&sort=${sortBy}`
  const { data, isLoading } = useSWR(buildUrl(apiUrl), fetcher)

  const docs = data?.docs || []
  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0

  return (
    <PageTransition className="space-y-6">
      <FadeIn direction="down">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </FadeIn>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="w-full h-11">
          <TabsTrigger value="bingo" className="flex-1">{t('tabs.bingo')}</TabsTrigger>
          <TabsTrigger value="race" className="flex-1">{t('tabs.race')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={category} onValueChange={(v) => setParam('category', v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('filters.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                {DDNET_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setParam('sort', v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('filters.sortPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0 animate-pulse">
                    <div className="h-6 w-6 rounded-full bg-muted" />
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="h-4 w-28 rounded bg-muted" />
                    <div className="h-4 w-10 rounded bg-muted ml-auto" />
                    <div className="h-4 w-10 rounded bg-muted" />
                    <div className="h-4 w-12 rounded bg-muted" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : docs.length > 0 ? (
            <ScaleIn>
              <Card>
                <CardContent className="p-0">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{t('columns.rank')}</TableHead>
                      <TableHead>{t('columns.player')}</TableHead>
                      <TableHead className="text-right">{t('columns.games')}</TableHead>
                      <TableHead className="text-right">{t('columns.wins')}</TableHead>
                      <TableHead className="text-right">{t('columns.winRate')}</TableHead>
                      {activeTab === 'bingo' && (
                        <TableHead className="text-right">{t('columns.maps')}</TableHead>
                      )}
                      {activeTab === 'race' && (
                        <TableHead className="text-right">{t('columns.rounds')}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((entry: any) => {
                      const skin = entry.user.skin
                      const platformOn = isPlatformOnline(entry.user.lastSeenAt)
                      return (
                        <TableRow key={entry.user.id}>
                          <TableCell>
                            <RankBadge rank={entry.rank} />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/app/players/${encodeURIComponent(entry.user.ingameNick)}`}
                              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                            >
                              <OnlineStatusIndicator
                                status={{ platformOnline: platformOn, inGameOnline: false }}
                                size="sm"
                              >
                                <TeeAvatarWithFallback
                                  skinUrl={skin?.name ? getDDNetSkinUrl(skin.name) : undefined}
                                  bodyColor={skin?.color_body}
                                  feetColor={skin?.color_feet}
                                  useCustomColors={!!(skin?.color_body || skin?.color_feet)}
                                  size="sm"
                                />
                              </OnlineStatusIndicator>
                              <span className="font-medium text-sm truncate">
                                {entry.user.ingameNick}
                              </span>
                              {entry.user.isSystemVerified && (
                                <StatusBadge status="verified" className="text-[10px] px-1.5 py-0" />
                              )}
                              <RoleBadge role={(entry.user as any).primaryRole || entry.user.roles} className="text-[10px] px-1.5 py-0" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {entry.stats.gamesPlayed}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {entry.stats.gamesWon}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'font-medium',
                                entry.stats.winRate >= 60 && 'text-green-600 dark:text-green-400',
                                entry.stats.winRate < 40 && 'text-red-500 dark:text-red-400',
                              )}
                            >
                              {entry.stats.winRate}%
                            </span>
                          </TableCell>
                          {activeTab === 'bingo' && (
                            <TableCell className="text-right text-muted-foreground">
                              {entry.stats.totalMapsCompleted}
                            </TableCell>
                          )}
                          {activeTab === 'race' && (
                            <TableCell className="text-right text-muted-foreground">
                              {entry.stats.roundsWon}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </ScaleIn>
          ) : (
            <ScaleIn>
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {category !== 'all' ? t('emptyForCategory', { category: getCategoryLabel(category as any) }) : t('empty')}
                </CardContent>
              </Card>
            </ScaleIn>
          )}

          {/* Pagination */}
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalDocs={totalDocs}
            limit={20}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardContent />
    </Suspense>
  )
}
