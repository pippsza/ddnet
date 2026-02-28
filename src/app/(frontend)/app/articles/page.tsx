'use client'

import { useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArticleGridSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { isPlatformOnline } from '@/lib/online-utils'
import { usePermissions } from '@/hooks/use-permissions'
import { useTranslations } from 'next-intl'
import { Eye, Heart, Search, Clock, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORY_KEYS = ['all', 'news', 'tutorial', 'guide', 'update', 'event', 'announcement'] as const

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-500/20 text-blue-400',
  tutorial: 'bg-green-500/20 text-green-400',
  guide: 'bg-purple-500/20 text-purple-400',
  update: 'bg-amber-500/20 text-amber-400',
  event: 'bg-pink-500/20 text-pink-400',
  announcement: 'bg-red-500/20 text-red-400',
}

function ArticlesContent() {
  const t = useTranslations('forum')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const search = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'all'
  const { page, setPage, buildUrl } = usePagination({ defaultLimit: 12 })

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      updateParams({ q: value.trim() || null })
    },
    [updateParams],
  )

  const handleCategoryChange = useCallback(
    (value: string) => {
      updateParams({ category: value === 'all' ? null : value })
    },
    [updateParams],
  )

  const baseParams = new URLSearchParams()
  if (category !== 'all') baseParams.set('where[category][equals]', category)
  if (search) baseParams.set('where[title][contains]', search)
  baseParams.set('sort', '-createdAt')
  baseParams.set('depth', '1')

  const { data, isLoading } = useSWR(buildUrl(`/api/articles?${baseParams}`), fetcher)
  const { data: featuredData } = useSWR(
    category === 'all' && !search && page === 1
      ? '/api/articles?where[featured][equals]=true&limit=3&depth=1'
      : null,
    fetcher,
  )

  const { hasPermission } = usePermissions()
  const canCreateArticles = hasPermission('articles', 'create')

  const featured = featuredData?.docs || []
  const featuredIds = new Set(featured.map((a: any) => a.id))
  const articles = (data?.docs || []).filter((a: any) => !featuredIds.has(a.id))
  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('articles.title')}</h1>
        {canCreateArticles && (
          <Button asChild>
            <Link href="/app/articles/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('articles.newArticle')}
            </Link>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          onDebouncedChange={handleSearchChange}
          defaultValue={search}
          placeholder={t('articles.searchPlaceholder')}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="flex-wrap gap-1 h-auto">
          {CATEGORY_KEYS.map((key) => (
            <TabsTrigger className="" key={key} value={key}>
              {t(`articles.categories.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Featured Articles */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('articles.featured')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {featured.map((article: any) => (
              <Link key={article.id} href={`/app/articles/${article.slug}`} className="block">
                <Card className="overflow-hidden hover:shadow-md hover:border-primary/30 transition-all h-full">
                  {article.coverImage?.url && (
                    <div className="relative aspect-video bg-muted">
                      <Image
                        src={article.coverImage.url}
                        alt={article.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <Badge
                      className={`text-[10px] ${CATEGORY_COLORS[article.category] || 'bg-secondary text-secondary-foreground'}`}
                    >
                      {t(`articles.categories.${article.category}`)}
                    </Badge>
                    <h3 className="font-semibold text-sm line-clamp-2 wrap-break-word">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2 wrap-break-word">
                        {article.excerpt}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles Grid */}
      {isLoading ? (
        <ArticleGridSkeleton />
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map((article: any) => (
            <Link key={article.id} href={`/app/articles/${article.slug}`} className="block">
              <Card className="overflow-hidden hover:shadow-md hover:border-primary/30 transition-all h-full">
                {article.coverImage?.url ? (
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={article.coverImage.url}
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <span className="text-3xl text-muted-foreground/30 font-bold">
                      {article.title?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] ${CATEGORY_COLORS[article.category] || 'bg-secondary text-secondary-foreground'}`}
                    >
                      {t(`articles.categories.${article.category}`)}
                    </Badge>
                    {article.tags?.map((tagItem: any) => {
                      const tag = tagItem.tag || tagItem
                      return (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </Badge>
                      )
                    })}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <OnlineStatusIndicator
                        status={{
                          platformOnline: isPlatformOnline(article.author?.lastSeenAt),
                          inGameOnline: false,
                        }}
                        size="xs"
                      >
                        <TeeAvatarWithFallback
                          skinUrl={
                            article.author?.ingameStats?.skin?.name
                              ? getDDNetSkinUrl(article.author.ingameStats.skin.name)
                              : undefined
                          }
                          bodyColor={article.author?.ingameStats?.skin?.color_body}
                          feetColor={article.author?.ingameStats?.skin?.color_feet}
                          useCustomColors={
                            !!(
                              article.author?.ingameStats?.skin?.color_body ||
                              article.author?.ingameStats?.skin?.color_feet
                            )
                          }
                          size="xs"
                        />
                      </OnlineStatusIndicator>
                      <span>{article.author?.ingameNick || t('articles.defaultAuthor')}</span>
                      <RoleBadge role={(article.author as any)?.primaryRole || article.author?.roles} className="text-[10px] px-1 py-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{article.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{article.likes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : featured.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('articles.noArticles')}
          </CardContent>
        </Card>
      ) : null}

      {/* Pagination */}
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

export default function ArticlesPage() {
  return (
    <Suspense fallback={<ArticleGridSkeleton />}>
      <ArticlesContent />
    </Suspense>
  )
}
