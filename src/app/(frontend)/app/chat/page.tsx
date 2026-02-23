'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { ChatBubble, ChatMessages, ChatInput } from '@/components/chat'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { isPlatformOnline } from '@/lib/online-utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetUserId = searchParams.get('user')
  const urlHandledRef = useRef(false)

  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Fetch current user
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const currentUserId = meData?.user?.id

  // Fetch conversations list
  const {
    data: convData,
    isLoading: convLoading,
    mutate: mutateConversations,
  } = useSWR('/api/chat/conversations', fetcher, {
    refreshInterval: 5000,
  })

  // Fetch active conversation messages
  const {
    data: msgData,
    isLoading: msgLoading,
    mutate: mutateMessages,
  } = useSWR(
    activeConversation ? `/api/chat/conversations/${activeConversation}` : null,
    fetcher,
    { refreshInterval: 3000 },
  )

  // Fetch friends online status
  const { data: onlineData } = useSWR('/api/friends/online', fetcher, {
    refreshInterval: 30000,
  })
  const onlineFriends = onlineData?.friends || []

  const conversations = convData?.conversations || []
  const messages = msgData?.messages || []

  // Poll typing status for all conversations (for sidebar indicators)
  const { data: typingAllData } = useSWR(
    '/api/chat/typing?scope=conversation&all=true',
    fetcher,
    { refreshInterval: 2000, revalidateOnFocus: false },
  )
  const typingAll: Record<string, Array<{ userId: string; userName: string }>> =
    typingAllData?.typingAll || {}

  // Merge friends + conversations into a unified sidebar list
  const sidebarEntries = useMemo(() => {
    const convByUserId = new Map<string, any>()
    for (const conv of conversations) {
      if (conv.otherUser?.id) {
        convByUserId.set(conv.otherUser.id, conv)
      }
    }

    const entries: Array<{
      key: string
      conversationId: string | null
      userId: string
      ingameNick: string
      roles: string
      lastSeenAt: string | null
      skin: any
      lastMessage: string | null
      lastMessageAt: string | null
      unreadCount: number
    }> = []

    // Add all conversations (they may include non-friends)
    for (const conv of conversations) {
      entries.push({
        key: conv.id,
        conversationId: conv.id,
        userId: conv.otherUser?.id || '',
        ingameNick: conv.otherUser?.ingameNick || 'Unknown',
        roles: conv.otherUser?.roles || 'player',
        lastSeenAt: conv.otherUser?.lastSeenAt || null,
        skin: conv.otherUser?.skin || null,
        lastMessage: conv.lastMessage || null,
        lastMessageAt: conv.lastMessageAt || null,
        unreadCount: conv.unreadCount || 0,
      })
    }

    // Add friends without conversations
    for (const friend of onlineFriends) {
      if (convByUserId.has(friend.userId)) continue
      entries.push({
        key: `friend-${friend.userId}`,
        conversationId: null,
        userId: friend.userId,
        ingameNick: friend.username || friend.nickname || 'Unknown',
        roles: friend.roles || 'player',
        lastSeenAt: null,
        skin: friend.skin || null,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      })
    }

    // Sort: conversations with messages first (by date desc), then no-message entries (by name)
    entries.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      }
      if (a.lastMessageAt) return -1
      if (b.lastMessageAt) return 1
      return a.ingameNick.localeCompare(b.ingameNick)
    })

    return entries
  }, [conversations, onlineFriends])

  // Auto-open conversation from ?user= URL param
  useEffect(() => {
    if (!targetUserId || urlHandledRef.current || convLoading) return
    urlHandledRef.current = true

    const conv = conversations.find((c: any) => c.otherUser?.id === targetUserId)
    if (conv) {
      setActiveConversation(conv.id)
    } else {
      // No existing conversation — create one
      fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.conversation?.id) {
            mutateConversations()
            setActiveConversation(data.conversation.id)
          }
        })
        .catch(() => {})
    }
  }, [targetUserId, conversations, convLoading, mutateConversations])

  // Select a sidebar entry — create conversation if needed
  const selectEntry = useCallback(
    async (entry: (typeof sidebarEntries)[0]) => {
      if (entry.conversationId) {
        setActiveConversation(entry.conversationId)
        router.replace(`/app/chat?user=${entry.userId}`, { scroll: false })
      } else {
        // Create conversation for friend
        try {
          const res = await fetch('/api/chat/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: entry.userId }),
          })
          const data = await res.json()
          if (data.conversation?.id) {
            await mutateConversations()
            setActiveConversation(data.conversation.id)
            router.replace(`/app/chat?user=${entry.userId}`, { scroll: false })
          }
        } catch {
          // ignore
        }
      }
    },
    [router, mutateConversations],
  )

  // Back to sidebar (mobile)
  const clearActiveConversation = useCallback(() => {
    setActiveConversation(null)
    router.replace('/app/chat', { scroll: false })
  }, [router])

  // Refetch conversations when switching to mark-as-read
  useEffect(() => {
    if (activeConversation) {
      const timer = setTimeout(() => mutateConversations(), 1000)
      return () => clearTimeout(timer)
    }
  }, [activeConversation, mutateConversations])

  const handleSendMessage = useCallback(async (content: string | any) => {
    if (typeof content !== 'string' || !content.trim() || !activeConversation || !currentUserId) return
    const message = content.trim()

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      content: message,
      sender: { id: currentUserId },
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }

    // Optimistic update: append new message immediately
    mutateMessages(
      (prev: any) => ({
        ...prev,
        messages: [optimisticMsg, ...(prev?.messages || [])],
      }),
      { revalidate: false },
    )

    // Optimistic update: move conversation to top with new last message
    mutateConversations(
      (prev: any) => {
        if (!prev?.conversations) return prev
        const convs = prev.conversations.map((c: any) =>
          c.id === activeConversation
            ? { ...c, lastMessage: message, lastMessageAt: new Date().toISOString() }
            : c,
        )
        return { ...prev, conversations: convs }
      },
      { revalidate: false },
    )

    setSending(true)
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation,
          content: message,
        }),
      })
      mutateMessages()
      mutateConversations()
    } catch {
      // Revert on error
      mutateMessages()
      mutateConversations()
    } finally {
      setSending(false)
    }
  }, [activeConversation, currentUserId, mutateMessages, mutateConversations])

  const activeConvData = activeConversation
    ? conversations.find((c: any) => c.id === activeConversation)
    : null
  const activeOtherUser = activeConvData?.otherUser || null

  // Typing indicator for active conversation (chat area)
  const { typingUsers, notifyTyping } = useTypingIndicator({
    scope: 'conversation',
    scopeId: activeConversation,
  })
  const typingText = typingUsers.length > 0 ? 'typing...' : null

  const getUserStatus = (userId: string, lastSeenAt?: string | null) => {
    const friend = onlineFriends.find((f: any) => f.userId === userId)
    const platformOnline = friend?.platformOnline ?? isPlatformOnline(lastSeenAt)
    const inGameOnline = friend?.online ?? false
    if (!platformOnline && !inGameOnline) return null
    return {
      platformOnline,
      inGameOnline,
      serverName: friend?.server?.name,
      mapName: friend?.server?.map,
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        {/* Conversations List */}
        <div
          className={cn(
            'w-full lg:w-80 lg:shrink-0 flex flex-col',
            activeConversation ? 'hidden lg:flex' : 'flex',
          )}
        >
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0 pb-3">
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {convLoading ? (
                <div className="space-y-2 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-14 w-14 rounded-full shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sidebarEntries.length > 0 ? (
                <div className="divide-y">
                  {sidebarEntries.map((entry) => {
                    const isTyping =
                      entry.conversationId && typingAll[entry.conversationId]?.length > 0
                    return (
                      <button
                        key={entry.key}
                        onClick={() => selectEntry(entry)}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors',
                          activeConversation === entry.conversationId && 'bg-muted',
                        )}
                      >
                        <OnlineStatusIndicator
                          status={entry.userId ? getUserStatus(entry.userId, entry.lastSeenAt) : null}
                          size="sm"
                          className="shrink-0"
                        >
                          <TeeAvatarWithFallback
                            skinUrl={entry.skin?.name ? getDDNetSkinUrl(entry.skin.name) : undefined}
                            bodyColor={entry.skin?.colorBody}
                            feetColor={entry.skin?.colorFeet}
                            useCustomColors={!!(entry.skin?.colorBody || entry.skin?.colorFeet)}
                            size="sm"
                          />
                        </OnlineStatusIndicator>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-medium truncate">
                                {entry.ingameNick}
                              </span>
                              <RoleBadge role={entry.roles} className="text-[10px] px-1 py-0" />
                            </span>
                            {entry.unreadCount > 0 && (
                              <Badge className="text-[10px] h-5 min-w-[20px] justify-center">
                                {entry.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            {isTyping ? (
                              <span className="text-xs text-green-500 italic truncate">
                                typing...
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground truncate">
                                {entry.lastMessage || 'No messages yet'}
                              </span>
                            )}
                            {entry.lastMessageAt && !isTyping && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatTime(entry.lastMessageAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No friends yet.
                  <br />
                  Add friends to start chatting!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col',
            !activeConversation ? 'hidden lg:flex' : 'flex',
          )}
        >
          {activeConversation ? (
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <CardHeader className="shrink-0 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={clearActiveConversation}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Link
                    href={`/app/players/${encodeURIComponent(activeOtherUser?.ingameNick || '')}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <OnlineStatusIndicator
                      status={activeOtherUser?.id ? getUserStatus(activeOtherUser.id, activeOtherUser.lastSeenAt) : null}
                      size="sm"
                    >
                      {(() => {
                        const skin = activeOtherUser?.skin
                        return (
                          <TeeAvatarWithFallback
                            skinUrl={skin?.name ? getDDNetSkinUrl(skin.name) : undefined}
                            bodyColor={skin?.colorBody}
                            feetColor={skin?.colorFeet}
                            useCustomColors={!!(skin?.colorBody || skin?.colorFeet)}
                            size="sm"
                          />
                        )
                      })()}
                    </OnlineStatusIndicator>
                    <span className="font-medium">
                      {activeOtherUser?.ingameNick || 'Unknown'}
                    </span>
                    <RoleBadge role={activeOtherUser?.roles} className="text-[10px] px-1.5 py-0" />
                  </Link>
                </div>
              </CardHeader>

              {/* Messages */}
              <ChatMessages
                scrollKey={messages.length}
                emptyText="No messages yet. Say hello!"
                className="px-4"
                typingText={typingText}
              >
                {msgLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                        <Skeleton className="h-12 w-48 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  [...messages].reverse().map((msg: any) => {
                    const isMe = msg.sender?.id === currentUserId
                    return (
                      <ChatBubble key={msg.id} isOwn={isMe} isOptimistic={msg._optimistic}>
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                        <p className={cn(
                          'text-[10px]',
                          isMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                        )}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </ChatBubble>
                    )
                  })
                ) : null}
              </ChatMessages>

              {/* Message Input */}
              <div className="shrink-0 px-4 pb-4">
                <ChatInput
                  onSend={handleSendMessage}
                  placeholder="Type a message... (Shift+Enter for new line)"
                  sending={sending}
                  onTyping={notifyTyping}
                />
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
