'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { Eye, MessageSquare, Pin, Lock, EyeOff } from 'lucide-react'

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

export default function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/forum/${id}`, fetcher)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [moderating, setModerating] = useState(false)

  if (isLoading) return <DetailPageSkeleton />

  const post = data?.post
  if (!post) {
    return (
      <div className="space-y-4">
        <Link href="/app/forum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Forum
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Post not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const author = typeof post.author === 'object' ? post.author : null

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await fetch(`/api/forum/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      })
      setReply('')
      mutate()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const handleModerate = async (action: Record<string, any>) => {
    setModerating(true)
    try {
      await fetch(`/api/forum/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
      mutate()
    } catch {
      // ignore
    } finally {
      setModerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/app/forum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back to Forum
      </Link>

      {/* Post Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {post.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                <CardTitle className="text-xl">{post.title}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {author && (
                  <div className="flex items-center gap-2">
                    {author.ingameStats?.skin ? (
                      <TeeAvatarWithFallback
                        skinUrl={getDDNetSkinUrl(author.ingameStats.skin)}
                        size="xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {author.ingameNick?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm font-medium">{author.ingameNick}</span>
                  </div>
                )}
                <Badge variant="secondary" className="text-xs">
                  {post.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{post.replies?.length || 0}</span>
              </div>
              {post.status === 'locked' && (
                <Badge variant="outline">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
              {post.status === 'hidden' && (
                <Badge variant="destructive">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hidden
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{extractText(post.content)}</p>
        </CardContent>
      </Card>

      {/* Moderation Panel */}
      {data?.isModeratorOrAdmin && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-xs font-medium text-muted-foreground mr-2">Moderate:</span>
            <Button
              size="sm"
              variant={post.isPinned ? 'default' : 'outline'}
              onClick={() => handleModerate({ isPinned: !post.isPinned })}
              disabled={moderating}
            >
              <Pin className="h-3.5 w-3.5 mr-1" />
              {post.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              size="sm"
              variant={post.status === 'locked' ? 'default' : 'outline'}
              onClick={() => handleModerate({ status: post.status === 'locked' ? 'published' : 'locked' })}
              disabled={moderating}
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              {post.status === 'locked' ? 'Unlock' : 'Lock'}
            </Button>
            <Button
              size="sm"
              variant={post.status === 'hidden' ? 'destructive' : 'outline'}
              onClick={() => handleModerate({ status: post.status === 'hidden' ? 'published' : 'hidden' })}
              disabled={moderating}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1" />
              {post.status === 'hidden' ? 'Unhide' : 'Hide'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Replies */}
      {post.replies?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          {post.replies.map((r: any, i: number) => {
            const replyAuthor = typeof r.author === 'object' ? r.author : null
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {replyAuthor?.ingameStats?.skin ? (
                        <TeeAvatarWithFallback
                          skinUrl={getDDNetSkinUrl(replyAuthor.ingameStats.skin)}
                          size="xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {replyAuthor?.ingameNick?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {replyAuthor?.ingameNick || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{extractText(r.content)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reply Form */}
      {post.status !== 'locked' && (
        <form onSubmit={handleReply} className="space-y-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={4}
            className="resize-none"
          />
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Reply'}
          </Button>
        </form>
      )}

      {post.status === 'locked' && (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <Lock className="h-4 w-4 inline mr-2" />
            This post is locked. No new replies can be added.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
