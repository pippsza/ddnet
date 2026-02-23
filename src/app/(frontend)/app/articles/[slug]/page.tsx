'use client'

import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { Eye, Heart, Clock, User } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function extractText(richText: any): string {
  if (typeof richText === 'string') return richText
  if (!richText?.root?.children) return ''
  return richText.root.children
    .map((node: any) => {
      if (node.children) {
        return node.children.map((child: any) => child.text || '').join('')
      }
      return ''
    })
    .join('\n')
}

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-500/10 text-blue-500',
  tutorial: 'bg-green-500/10 text-green-500',
  guide: 'bg-purple-500/10 text-purple-500',
  update: 'bg-amber-500/10 text-amber-500',
  event: 'bg-pink-500/10 text-pink-500',
  announcement: 'bg-red-500/10 text-red-500',
}

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data, isLoading } = useSWR(
    `/api/articles?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    fetcher,
  )

  if (isLoading) return <DetailPageSkeleton />

  const article = data?.docs?.[0]
  if (!article) {
    return (
      <div className="space-y-4">
        <Link href="/app/articles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Articles
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Article not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/app/articles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back to Articles
      </Link>

      {/* Cover Image */}
      {article.coverImage?.url && (
        <div className="relative aspect-[21/9] rounded-lg overflow-hidden bg-muted">
          <Image
            src={article.coverImage.url}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={CATEGORY_COLORS[article.category] || ''}>
            {article.category}
          </Badge>
          {article.tags?.map((t: any) => (
            <Badge key={t.tag || t} variant="outline" className="text-xs">
              {t.tag || t}
            </Badge>
          ))}
          {article.featured && (
            <Badge className="bg-amber-500/10 text-amber-500">Featured</Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold">{article.title}</h1>

        {article.excerpt && (
          <p className="text-lg text-muted-foreground">{article.excerpt}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{article.author?.ingameNick || 'Admin'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            <span>{article.views || 0} views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" />
            <span>{article.likes || 0} likes</span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
            {extractText(article.content)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
