'use client'

import { Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { DashboardSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { useDDStats } from '@/hooks/use-ddstats'
import { useGameStats } from '@/hooks/use-game-stats'
import { formatHours, formatPlaytime, formatDateShort } from '@/lib/format-utils'
import { PageTransition, StaggerContainer, StaggerItem, ScaleIn } from '@/components/ui/animations'

import { ServiceStatsSection } from '@/components/stats/ServiceStatsSection'
import { DDNetSection } from '@/components/stats/DDNetSection'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TAB_TRIGGER_CLASSES =
  'flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-primary'

function DashboardContent() {
  const t = useTranslations('dashboard')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') || 'service'

  const { data: user, isLoading } = useSWR('/api/users/me', fetcher, { refreshInterval: 30000 })

  const userData = user?.user
  const { ddstats, ddstatsLoading } = useDDStats(userData?.ingameNick)
  const gameStats = useGameStats(userData?.id)

  if (isLoading) return <DashboardSkeleton />

  const skinUrl = userData?.ingameStats?.skin?.name
    ? getDDNetSkinUrl(userData.ingameStats.skin.name)
    : undefined

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Weekly trend from DDStats
  const weeklyPts = ddstats?.points?.weekly_points?.points
  const weeklyTrend = weeklyPts && weeklyPts > 0 ? `+${weeklyPts}` : undefined

  // Playtime from DDStats
  const totalPlaytime = ddstats?.general_activity?.total_seconds_played
  const playingSince = ddstats?.general_activity?.start_of_playtime

  // Current month playtime
  const currentMonthData = ddstats?.playtime_per_month?.at(-1)
  const currentMonthHours = currentMonthData
    ? formatHours(currentMonthData.seconds_played)
    : undefined

  return (
    <PageTransition className="space-y-6">
      {/* Profile Header */}
      <ScaleIn>
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
            <OnlineStatusIndicator
              status={{ platformOnline: true, inGameOnline: false }}
              size="xl"
              className="shrink-0"
            >
              <TeeAvatarWithFallback
                skinUrl={skinUrl}
                bodyColor={userData?.ingameStats?.skin?.colorBody}
                feetColor={userData?.ingameStats?.skin?.colorFeet}
                size="xl"
                lookAtCursor
                useCustomColors={
                  !!(
                    userData?.ingameStats?.skin?.colorBody || userData?.ingameStats?.skin?.colorFeet
                  )
                }
              />
            </OnlineStatusIndicator>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-2xl font-bold truncate">
                  {userData?.ingameNick || t('fallbackName')}
                </h1>
                {userData?.isSystemVerified && <StatusBadge status="verified" />}
                <RoleBadge role={(userData as any)?.primaryRole || userData?.roles} />
              </div>
              {userData?.ingameStats?.points !== undefined && (
                <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-muted-foreground flex-wrap">
                  <span className="text-lg font-semibold text-foreground">
                    {userData.ingameStats.points.toLocaleString()} {t('points')}
                  </span>
                  {userData.ingameStats.rank && (
                    <span>{t('rank', { rank: userData.ingameStats.rank })}</span>
                  )}
                  {totalPlaytime ? (
                    <span>
                      {formatPlaytime(totalPlaytime)} {t('played')}
                    </span>
                  ) : null}
                </div>
              )}
              {playingSince && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('playingSince', { date: formatDateShort(playingSince) })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </ScaleIn>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="w-full h-11">
          <TabsTrigger value="service" className={TAB_TRIGGER_CLASSES}>
            {t('tabs.service')}
          </TabsTrigger>
          <TabsTrigger value="ddnet" className={TAB_TRIGGER_CLASSES}>
            {t('tabs.ddnet')}
          </TabsTrigger>
        </TabsList>

        {/* ═══ SERVICE TAB ═══ */}
        <TabsContent value="service" className="space-y-6 mt-4">
          {/* Game Cards */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StaggerItem>
              <ScaleIn>
                <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        B
                      </span>
                      {t('bingo.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{t('bingo.description')}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href="/app/bingo/create"
                        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        {t('bingo.createButton')}
                      </Link>
                      <Link
                        href="/app/bingo"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {t('bingo.browseButton')}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </ScaleIn>
            </StaggerItem>
            <StaggerItem>
              <ScaleIn>
                <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm font-bold">
                        R
                      </span>
                      {t('race.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{t('race.description')}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href="/app/race/create"
                        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        {t('race.createButton')}
                      </Link>
                      <Link
                        href="/app/race"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {t('race.browseButton')}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </ScaleIn>
            </StaggerItem>
          </StaggerContainer>

          {/* Shared service stats */}
          <ScaleIn>
            <ServiceStatsSection gameStats={gameStats} />
          </ScaleIn>
        </TabsContent>

        {/* ═══ DDNET TAB ═══ */}
        <TabsContent value="ddnet" className="space-y-6 mt-4">
          <DDNetSection
            ddstatsLoading={ddstatsLoading}
            ddstats={ddstats}
            totalPoints={userData?.ingameStats?.points || 0}
            rank={userData?.ingameStats?.rank || null}
            weeklyTrend={weeklyTrend}
            totalPlaytime={totalPlaytime}
            currentMonthHours={currentMonthHours}
            playingSince={playingSince}
            fourthStat={{ title: t('friends.title'), value: userData?.friend?.length || 0 }}
            recentFinishesLimit={10}
            showMostPlayedMaps={false}
          />
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
