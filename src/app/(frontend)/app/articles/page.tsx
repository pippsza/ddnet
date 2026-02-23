'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { Eye, Heart, Search, Clock, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Guide' },
  { value: 'update', label: 'Update' },
  { value: 'event', label: 'Event' },
  { value: 'announcement', label: 'Announcement' },
]

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-500/10 text-blue-500',
  tutorial: 'bg-green-500/10 text-green-500',
  guide: 'bg-purple-500/10 text-purple-500',
  update: 'bg-amber-500/10 text-amber-500',
  event: 'bg-pink-500/10 text-pink-500',
  announcement: 'bg-red-500/10 text-red-500',
}

export default function ArticlesPage() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = new URLSearchParams()
  if (category !== 'all') queryParams.set('where[category][equals]', category)
  if (search) queryParams.set('where[title][contains]', search)
  queryParams.set('page', String(page))
  queryParams.set('limit', '12')
  queryParams.set('sort', '-createdAt')
  queryParams.set('depth', '1')

  const { data, isLoading } = useSWR(`/api/articles?${queryParams}`, fetcher)
  const { data: featuredData } = useSWR(
    category === 'all' && !search && page === 1
      ? '/api/articles?where[featured][equals]=true&limit=3&depth=1'
      : null,
    fetcher,
  )

  const { data: meData } = useSWR('/api/users/me', fetcher)
  const isStaff = meData?.user?.roles === 'admin' || meData?.user?.roles === 'moderator'

  const articles = data?.docs || []
  const totalPages = data?.totalPages || 1
  const featured = featuredData?.docs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        {isStaff && (
          <Button asChild>
            <Link href="/app/articles/create">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Link>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search articles..."
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

      {/* Featured Articles */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Badge variant="secondary" className={`text-[10px] ${CATEGORY_COLORS[article.category] || ''}`}>
                      {article.category}
                    </Badge>
                    <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                    {article.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
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
        <CardListSkeleton />
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <Badge variant="secondary" className={`text-[10px] ${CATEGORY_COLORS[article.category] || ''}`}>
                      {article.category}
                    </Badge>
                    {article.tags?.map((t: any) => (
                      <Badge key={t.tag || t} variant="outline" className="text-[10px]">
                        {t.tag || t}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>{article.author?.ingameNick || 'Admin'}</span>
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No articles found.
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
