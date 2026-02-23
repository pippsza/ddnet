'use client'

import { useState, useCallback, Suspense } from 'react'
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
import { MessageSquare, Eye, Pin, Search, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'help', label: 'Help' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'bugs', label: 'Bugs' },
  { value: 'maps', label: 'Maps' },
  { value: 'clans', label: 'Clans' },
  { value: 'offtopic', label: 'Off-topic' },
]

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
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const { page, setPage, resetPage } = usePagination({ defaultLimit: 20 })

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    resetPage()
  }, [resetPage])

  const queryParams = new URLSearchParams()
  if (category !== 'all') queryParams.set('category', category)
  if (search) queryParams.set('q', search)
  queryParams.set('page', String(page))
  queryParams.set('limit', '20')

  const { data, isLoading } = useSWR(`/api/forum?${queryParams}`, fetcher)

  const posts = data?.posts || []
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forum</h1>
        <Button asChild>
          <Link href="/app/forum/create">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          onDebouncedChange={handleSearchChange}
          placeholder="Search posts..."
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={(v) => { setCategory(v); resetPage() }}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label}
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
                      size="sm"
                    >
                      <TeeAvatarWithFallback
                        skinUrl={post.author?.skin ? getDDNetSkinUrl(post.author.skin) : undefined}
                        size="sm"
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
                        <Badge variant="outline" className="text-xs shrink-0">Locked</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{post.author?.ingameNick || 'Unknown'}</span>
                      <RoleBadge role={post.author?.roles} className="text-[10px] px-1.5 py-0" />
                      <span>&middot;</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[post.category] || ''}`}>
                        {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
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
            No posts found. Be the first to start a discussion!
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        limit={20}
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
