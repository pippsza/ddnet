'use client'

import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { isPlatformOnline } from '@/lib/online-utils'
import { Eye, Heart, Clock, Pencil, ArrowLeft } from 'lucide-react'

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
  news: 'bg-blue-500/20 text-blue-400',
  tutorial: 'bg-green-500/20 text-green-400',
  guide: 'bg-purple-500/20 text-purple-400',
  update: 'bg-amber-500/20 text-amber-400',
  event: 'bg-pink-500/20 text-pink-400',
  announcement: 'bg-red-500/20 text-red-400',
}

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data, isLoading } = useSWR(
    `/api/articles?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    fetcher,
  )
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const isStaff = meData?.user?.roles === 'admin' || meData?.user?.roles === 'moderator'

  if (isLoading) return <DetailPageSkeleton />

  const article = data?.docs?.[0]
  if (!article) {
    return (
      <div className="space-y-4">
        <Link href="/app/articles" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Articles
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
      <div className="flex items-center justify-between">
        <Link href="/app/articles" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </Link>
        {isStaff && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/articles/${slug}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Link>
          </Button>
        )}
      </div>

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
          <Badge className={CATEGORY_COLORS[article.category] || 'bg-secondary text-secondary-foreground'}>
            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
          </Badge>
          {article.tags?.map((t: any) => {
            const tag = t.tag || t
            return (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </Badge>
            )
          })}
          {article.featured && (
            <Badge className="bg-amber-500/10 text-amber-500">Featured</Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold wrap-break-word">{article.title}</h1>

        {article.excerpt && (
          <p className="text-lg text-muted-foreground wrap-break-word">{article.excerpt}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <OnlineStatusIndicator
              status={{ platformOnline: isPlatformOnline(article.author?.lastSeenAt), inGameOnline: false }}
              size="xs"
            >
              <TeeAvatarWithFallback
                skinUrl={article.author?.ingameStats?.skin?.name
                  ? getDDNetSkinUrl(article.author.ingameStats.skin.name) : undefined}
                bodyColor={article.author?.ingameStats?.skin?.color_body}
                feetColor={article.author?.ingameStats?.skin?.color_feet}
                useCustomColors={!!(article.author?.ingameStats?.skin?.color_body || article.author?.ingameStats?.skin?.color_feet)}
                size="xs"
              />
            </OnlineStatusIndicator>
            <span>{article.author?.ingameNick || 'Admin'}</span>
            <RoleBadge role={article.author?.roles} className="text-[10px] px-1.5 py-0" />
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
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed wrap-break-word">
            {extractText(article.content)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
