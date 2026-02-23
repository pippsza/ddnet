'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
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

export default function ForumPage() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = new URLSearchParams()
  if (category !== 'all') queryParams.set('category', category)
  if (search) queryParams.set('q', search)
  queryParams.set('page', String(page))
  queryParams.set('limit', '20')

  const { data, isLoading } = useSWR(`/api/forum?${queryParams}`, fetcher)

  const posts = data?.posts || []
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-6">
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
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search posts..."
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
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
                    {post.author?.skin ? (
                      <TeeAvatarWithFallback
                        skinUrl={getDDNetSkinUrl(post.author.skin)}
                        size="xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {post.author?.ingameNick?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
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
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
