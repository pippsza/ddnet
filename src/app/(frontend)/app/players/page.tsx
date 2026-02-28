'use client'

import { useCallback, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerCard } from '@/components/players/PlayerCard'
import { PlayerGridSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { isPlatformOnline } from '@/lib/online-utils'
import { Search } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function PlayersContent() {
  const t = useTranslations('players')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const search = searchParams.get('q') || ''
  const { page, setPage, resetPage, buildUrl } = usePagination({ defaultLimit: 12 })

  const handleSearchChange = useCallback((value: string) => {
    const trimmed = value.trim()
    const params = new URLSearchParams(searchParams.toString())
    if (trimmed) {
      params.set('q', trimmed)
    } else {
      params.delete('q')
    }
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

  const baseUrl = search
    ? `/api/players/search?q=${encodeURIComponent(search)}`
    : '/api/players/search'

  const { data, isLoading } = useSWR(buildUrl(baseUrl), fetcher)

  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          onDebouncedChange={handleSearchChange}
          defaultValue={search}
          placeholder={t('list.searchPlaceholder')}
          className="pl-10"
        />
      </div>

      {isLoading && <PlayerGridSkeleton />}

      {!isLoading && data && (
        <div className="space-y-6">
          {/* Registered Players */}
          {data.registered?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                {search ? t('list.registered') : t('list.community')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.registered.map((player: any) => (
                  <PlayerCard
                    key={player.name}
                    name={player.name}
                    points={player.points}
                    rank={player.rank}
                    isVerified={player.isVerified}
                    platformOnline={isPlatformOnline(player.lastSeenAt)}
                    role={(player as any).primaryRole || player.roles}
                    skin={player.skin}
                    variant="registered"
                  />
                ))}
              </div>
            </div>
          )}

          {/* DDNet Results */}
          {data.ddnet?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">{t('list.ddnet')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.ddnet.map((player: any) => (
                  <PlayerCard
                    key={player.name}
                    name={player.name}
                    points={player.points}
                    rank={player.rank}
                    variant="ddnet"
                  />
                ))}
              </div>
            </div>
          )}

          {data.registered?.length === 0 && data.ddnet?.length === 0 && search && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('list.noPlayersFound', { search })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalDocs={totalDocs}
        limit={12}
        onPageChange={setPage}
      />
    </div>
  )
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayerGridSkeleton />}>
      <PlayersContent />
    </Suspense>
  )
}
