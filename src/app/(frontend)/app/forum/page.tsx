'use client'

import { useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { isPlatformOnline } from '@/lib/online-utils'
import { useTranslations } from 'next-intl'
import { MessageSquare, Eye, Pin, Search, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORY_KEYS = ['all', 'general', 'help', 'suggestions', 'bugs', 'maps', 'clans', 'offtopic'] as const

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-500',
  help: 'bg-green-500/10 text-green-500',
  suggestions: 'bg-purple-500/10 text-purple-500',
  bugs: 'bg-red-500/10 text-red-500',
  maps: 'bg-amber-500/10 text-amber-500',
  clans: 'bg-cyan-500/10 text-cyan-500',
  offtopic: 'bg-gray-500/10 text-gray-500',
}

function ForumContent() {
  const t = useTranslations('forum')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const search = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'all'
  const { page, setPage } = usePagination({ defaultLimit: 20 })

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

  const queryParams = new URLSearchParams()
  if (category !== 'all') queryParams.set('category', category)
  if (search) queryParams.set('q', search)
  queryParams.set('page', String(page))
  queryParams.set('limit', '18')

  const { data, isLoading } = useSWR(`/api/forum?${queryParams}`, fetcher)

  const posts = data?.posts || []
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
        <Button asChild>
          <Link href="/app/forum/create">
            <Plus className="h-4 w-4 mr-2" />
            {t('list.newPost')}
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          onDebouncedChange={handleSearchChange}
          defaultValue={search}
          placeholder={t('list.searchPlaceholder')}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORY_KEYS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`list.categories.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Posts List */}
      {isLoading ? (
        <CardListSkeleton />
      ) : posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map((post: any) => (
            <Link key={post.id} href={`/app/forum/${post.id}`} className="block">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Author Avatar */}
                  <div className="shrink-0">
                    <OnlineStatusIndicator
                      status={{ platformOnline: isPlatformOnline(post.author?.lastSeenAt), inGameOnline: false }}
                      size="md"
                    >
                      <TeeAvatarWithFallback
                        skinUrl={post.author?.skin ? getDDNetSkinUrl(post.author.skin) : undefined}
                        size="md"
                      />
                    </OnlineStatusIndicator>
                  </div>

                  {/* Post Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.isPinned && (
                        <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="font-semibold text-sm truncate">{post.title}</span>
                      {post.status === 'locked' && (
                        <Badge variant="outline" className="text-xs shrink-0">{t('list.locked')}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{post.author?.ingameNick || t('list.unknownAuthor')}</span>
                      <RoleBadge role={(post.author as any)?.primaryRole || post.author?.roles} className="text-[10px] px-1.5 py-0" />
                      <span>&middot;</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[post.category] || ''}`}>
                        {CATEGORY_KEYS.includes(post.category) ? t(`list.categories.${post.category}`) : post.category}
                      </span>
                      <span>&middot;</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{post.replyCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('list.noPosts')}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        limit={18}
        onPageChange={setPage}
      />
    </div>
  )
}

export default function ForumPage() {
  return (
    <Suspense fallback={<CardListSkeleton />}>
      <ForumContent />
    </Suspense>
  )
}
