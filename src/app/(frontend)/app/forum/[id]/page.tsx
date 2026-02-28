'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { LexicalContent } from '@/components/ui/LexicalContent'
import { ChatBubble, ChatMessages, ChatInput } from '@/components/chat'
import { MessageImages } from '@/components/chat/MessageImages'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { isPlatformOnline } from '@/lib/online-utils'
import { useTranslations } from 'next-intl'
import { Eye, MessageSquare, Pin, Lock, EyeOff, ArrowLeft } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function MessageAvatar({ user, mirrored }: { user: any; mirrored?: boolean }) {
  const skin = user?.ingameStats?.skin
  return (
    <div className="shrink-0">
      <OnlineStatusIndicator
        status={{ platformOnline: isPlatformOnline(user?.lastSeenAt), inGameOnline: false }}
        size="sm"
      >
        <TeeAvatarWithFallback
          skinUrl={skin?.name ? getDDNetSkinUrl(skin.name) : undefined}
          bodyColor={skin?.color_body}
          feetColor={skin?.color_feet}
          useCustomColors={!!(skin?.color_body || skin?.color_feet)}
          size="sm"
          mirrored={mirrored}
        />
      </OnlineStatusIndicator>
    </div>
  )
}

function MessageHeader({ user, timestamp, isOwn }: { user: any; timestamp: string; isOwn: boolean }) {
  const t = useTranslations('forum')
  const name = user?.ingameNick || t('post.unknownAuthor')
  const time = <span className="text-xs text-muted-foreground">{new Date(timestamp).toLocaleString()}</span>
  const role = <RoleBadge role={(user as any)?.primaryRole || user?.roles} className="text-[10px] px-1.5 py-0" />
  const nameEl = <span className="text-sm font-medium">{name}</span>

  return isOwn
    ? <>{time}{role}{nameEl}</>
    : <>{nameEl}{role}{time}</>
}

export default function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('forum')
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/forum/${id}`, fetcher)
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const [sending, setSending] = useState(false)
  const [moderating, setModerating] = useState(false)

  const post = data?.post
  const author = post ? (typeof post.author === 'object' ? post.author : null) : null
  const currentUserId = meData?.user?.id

  // Typing indicator
  const { typingUsers, notifyTyping } = useTypingIndicator({
    scope: 'forum',
    scopeId: id,
  })
  const typingText = typingUsers.length > 0
    ? `${typingUsers.map((u) => u.userName).join(', ')} ${t('post.typing')}`
    : null

  if (isLoading) return <DetailPageSkeleton />

  if (!post) {
    return (
      <div className="space-y-4">
        <Link href="/app/forum" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t('post.backToForum')}
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t('post.notFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleReply = async (content: any, images?: string[]) => {
    const hasImages = images && images.length > 0
    if (!content && !hasImages) return

    const optimisticReply = {
      author: meData?.user || { id: currentUserId },
      content,
      createdAt: new Date().toISOString(),
      ...(hasImages && { images: images.map((imgId) => ({ image: { id: imgId, url: '' } })) }),
    }

    setSending(true)
    await mutate(
      async (current: any) => {
        try {
          await fetch(`/api/forum/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, ...(hasImages && { images }) }),
          })
          const res = await fetch(`/api/forum/${id}`)
          return await res.json()
        } catch {
          return current
        }
      },
      {
        optimisticData: data
          ? {
              ...data,
              post: {
                ...data.post,
                replies: [...(data.post.replies || []), optimisticReply],
              },
            }
          : undefined,
        rollbackOnError: true,
      },
    )
    setSending(false)
  }

  const handleModerate = async (action: Record<string, any>) => {
    setModerating(true)
    try {
      await fetch(`/api/forum-posts/${id}`, {
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

  const isLocked = post.status === 'locked'

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Compact header */}
      <div className="shrink-0 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <Link href="/app/forum" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {post.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            <h1 className="text-base font-semibold truncate">{post.title}</h1>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {t(`list.categories.${post.category}`)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="hidden sm:inline">
              {author?.ingameNick || t('post.unknownAuthor')} &middot; {new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{post.views || 0}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{post.replies?.length || 0}</span>
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
            {post.status === 'hidden' && <EyeOff className="h-3 w-3 text-destructive" />}
          </div>
        </div>

        {/* Moderation Panel */}
        {data?.isModeratorOrAdmin && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground mr-1">{t('post.mod.label')}</span>
            <Button
              size="sm"
              variant={post.isPinned ? 'default' : 'outline'}
              onClick={() => handleModerate({ isPinned: !post.isPinned })}
              disabled={moderating}
              className="h-6 text-xs px-2"
            >
              <Pin className="h-3 w-3 mr-1" />
              {post.isPinned ? t('post.mod.unpin') : t('post.mod.pin')}
            </Button>
            <Button
              size="sm"
              variant={isLocked ? 'default' : 'outline'}
              onClick={() => handleModerate({ status: isLocked ? 'published' : 'locked' })}
              disabled={moderating}
              className="h-6 text-xs px-2"
            >
              <Lock className="h-3 w-3 mr-1" />
              {isLocked ? t('post.mod.unlock') : t('post.mod.lock')}
            </Button>
            <Button
              size="sm"
              variant={post.status === 'hidden' ? 'destructive' : 'outline'}
              onClick={() => handleModerate({ status: post.status === 'hidden' ? 'published' : 'hidden' })}
              disabled={moderating}
              className="h-6 text-xs px-2"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              {post.status === 'hidden' ? t('post.mod.unhide') : t('post.mod.hide')}
            </Button>
          </div>
        )}
      </div>

      {/* Chat-style messages — scrollable */}
      <ChatMessages scrollKey={post.replies?.length} emptyText="" typingText={typingText}>
        {/* Original post */}
        {(() => {
          const isOwn = author?.id === currentUserId
          return (
            <ChatBubble
              isOwn={isOwn}
              avatar={<MessageAvatar user={author} mirrored={isOwn} />}
              header={<MessageHeader user={author} timestamp={post.createdAt} isOwn={isOwn} />}
            >
              <LexicalContent content={post.content} />
              <MessageImages images={post.images} />
            </ChatBubble>
          )
        })()}

        {/* Replies */}
        {post.replies?.map((r: any, i: number) => {
          const replyAuthor = typeof r.author === 'object' ? r.author : null
          const isOwn = replyAuthor?.id === currentUserId

          return (
            <ChatBubble
              key={i}
              isOwn={isOwn}
              avatar={<MessageAvatar user={replyAuthor} mirrored={isOwn} />}
              header={<MessageHeader user={replyAuthor} timestamp={r.createdAt} isOwn={isOwn} />}
            >
              <LexicalContent content={r.content} />
              <MessageImages images={r.images} />
            </ChatBubble>
          )
        })}
      </ChatMessages>

      {/* Reply Editor */}
      <ChatInput
        richText
        onSend={handleReply}
        placeholder={t('post.replyPlaceholder')}
        sending={sending}
        disabled={isLocked}
        disabledMessage={t('post.lockedMessage')}
        onTyping={notifyTyping}
      />
    </div>
  )
}
