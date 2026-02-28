'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useTranslations } from 'next-intl'
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
import { MessageImages } from '@/components/chat/MessageImages'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { isPlatformOnline } from '@/lib/online-utils'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowLeft, MessageCircle, Search, Trash2, X } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}

function ChatContent() {
  const t = useTranslations('chat')
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetUserId = searchParams.get('user')
  const urlHandledRef = useRef(false)

  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  // searchQuery is the debounced value — updated by PlayerSearchInput after 300ms
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResetToken, setSearchResetToken] = useState(0)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
  } = useSWR(activeConversation ? `/api/chat/conversations/${activeConversation}` : null, fetcher, {
    refreshInterval: 3000,
  })

  // Search platform users — searchQuery is already debounced (set by PlayerSearchInput)
  const { data: searchData, isLoading: searchLoading } = useSWR(
    searchQuery.length >= 2
      ? `/api/users?where[ingameNick][contains]=${encodeURIComponent(searchQuery)}&limit=8&depth=1`
      : null,
    fetcher,
  )

  // Fetch friends online status
  const { data: onlineData } = useSWR('/api/friends/online', fetcher, {
    refreshInterval: 30000,
  })
  const onlineFriends = onlineData?.friends || []

  const conversations = convData?.conversations || []
  const messages = msgData?.messages || []

  // Poll typing status for all conversations (for sidebar indicators)
  const { data: typingAllData } = useSWR('/api/chat/typing?scope=conversation&all=true', fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: false,
  })
  const typingAll: Record<
    string,
    Array<{ userId: string; userName: string }>
  > = typingAllData?.typingAll || {}

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
      primaryRole: any
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
        primaryRole: (conv.otherUser as any)?.primaryRole || null,
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
        ingameNick: friend.ingameNick || friend.nickname || 'Unknown',
        roles: friend.roles || 'player',
        primaryRole: (friend as any).primaryRole || null,
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

  // IDs already shown in sidebar
  const sidebarUserIds = useMemo(
    () => new Set(sidebarEntries.map((e) => e.userId)),
    [sidebarEntries],
  )

  // Filter sidebar by search query
  const filteredEntries = useMemo(
    () =>
      searchQuery
        ? sidebarEntries.filter((e) =>
            e.ingameNick.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : sidebarEntries,
    [sidebarEntries, searchQuery],
  )

  // Platform users not already in sidebar (shown as "Other players")
  const otherPlayers = useMemo(() => {
    if (searchQuery.length < 2 || !searchData?.docs) return []
    return (searchData.docs as any[]).filter(
      (u) => !sidebarUserIds.has(u.id) && u.id !== currentUserId,
    )
  }, [searchData, sidebarUserIds, currentUserId, searchQuery])

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
    setSearchResetToken((t) => t + 1)
    router.replace('/app/chat', { scroll: false })
  }, [router])

  // Open conversation with a platform user not yet in sidebar
  const selectOtherPlayer = useCallback(
    async (player: any) => {
      const skin = player.ingameStats?.skin
      await selectEntry({
        key: player.id,
        conversationId: conversations.find((c: any) => c.otherUser?.id === player.id)?.id || null,
        userId: player.id,
        ingameNick: player.ingameNick,
        roles: player.roles || 'player',
        primaryRole: player.primaryRole || null,
        lastSeenAt: player.lastSeenAt || null,
        skin: skin?.name
          ? { name: skin.name, colorBody: skin.color_body || 0, colorFeet: skin.color_feet || 0 }
          : null,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      })
      setSearchResetToken((t) => t + 1)
    },
    [conversations, selectEntry],
  )

  // Refetch conversations when switching to mark-as-read
  useEffect(() => {
    if (activeConversation) {
      const timer = setTimeout(() => mutateConversations(), 1000)
      return () => clearTimeout(timer)
    }
  }, [activeConversation, mutateConversations])

  const handleSendMessage = useCallback(
    async (content: string | any, images?: string[]) => {
      if (!activeConversation || !currentUserId) return
      const message = typeof content === 'string' ? content.trim() : ''
      const hasImages = images && images.length > 0
      if (!message && !hasImages) return

      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        content: message || (hasImages ? '[image]' : ''),
        sender: { id: currentUserId },
        createdAt: new Date().toISOString(),
        _optimistic: true,
        ...(hasImages && { images: images.map((id) => ({ image: { id, url: '' } })) }),
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
              ? { ...c, lastMessage: message || '[image]', lastMessageAt: new Date().toISOString() }
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
            ...(hasImages && { images }),
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
    },
    [activeConversation, currentUserId, mutateMessages, mutateConversations],
  )

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      const prevData = convData
      mutateConversations(
        (prev: any) => ({
          ...prev,
          conversations: (prev?.conversations || []).filter((c: any) => c.id !== convId),
        }),
        { revalidate: false },
      )
      if (activeConversation === convId) {
        setActiveConversation(null)
        router.replace('/app/chat', { scroll: false })
      }
      try {
        const res = await fetch(`/api/chat/conversations/${convId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
        mutateConversations()
      } catch {
        mutateConversations(prevData, { revalidate: false })
        toast.error(t('deleteError'))
      }
    },
    [convData, activeConversation, mutateConversations, router],
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const prevData = convData
    mutateConversations(
      (prev: any) => ({
        ...prev,
        conversations: (prev?.conversations || []).filter((c: any) => !selectedIds.has(c.id)),
      }),
      { revalidate: false },
    )
    if (activeConversation && selectedIds.has(activeConversation)) {
      setActiveConversation(null)
      router.replace('/app/chat', { scroll: false })
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    try {
      const res = await fetch('/api/chat/conversations/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error()
      mutateConversations()
    } catch {
      mutateConversations(prevData, { revalidate: false })
      toast.error(t('deleteMultipleError'))
    }
  }, [selectedIds, convData, activeConversation, mutateConversations, router])

  const toggleSelect = useCallback((convId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(convId)) next.delete(convId)
      else next.add(convId)
      return next
    })
  }, [])

  const selectableConvIds = useMemo(
    () => filteredEntries.filter((e) => e.conversationId).map((e) => e.conversationId!),
    [filteredEntries],
  )

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === selectableConvIds.length) return new Set()
      return new Set(selectableConvIds)
    })
  }, [selectableConvIds])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const activeConvData = activeConversation
    ? conversations.find((c: any) => c.id === activeConversation)
    : null
  const activeOtherUser = activeConvData?.otherUser || null

  // Typing indicator for active conversation (chat area)
  const { typingUsers, notifyTyping } = useTypingIndicator({
    scope: 'conversation',
    scopeId: activeConversation,
  })
  const typingText = typingUsers.length > 0 ? t('typing') : null

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
    <div className="-m-6 lg:m-0 h-[calc(100dvh-4.5rem)] lg:h-[calc(100vh-8rem)] overflow-hidden">
      <div className="flex h-full lg:gap-4">
        {/* Conversations List */}
        <div
          className={cn(
            'w-full lg:w-80 lg:shrink-0 flex flex-col',
            activeConversation ? 'hidden lg:flex' : 'flex',
          )}
        >
          <Card className="flex-1 flex flex-col overflow-hidden border-0 rounded-none shadow-none py-0 gap-0 lg:border lg:rounded-xl lg:shadow-sm lg:py-6 lg:gap-6">
            <CardHeader className="shrink-0 px-4 py-0 gap-2">
              {selectMode ? (
                <div className="flex items-center justify-between py-6 md:py-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.size === selectableConvIds.length && selectableConvIds.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size > 0 ? t('selectedCount', { count: selectedIds.size }) : t('selectAll')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t('deleteSelected', { count: selectedIds.size })}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-6 md:py-2">
                  <CardTitle className="text-lg">{t('title')}</CardTitle>
                  {conversations.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectMode(true)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              {!selectMode && (
                <PlayerSearchInput
                  onSearch={setSearchQuery}
                  resetToken={searchResetToken}
                />
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {convLoading && !searchQuery ? (
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
              ) : (
                <div className="divide-y">
                  {/* Conversations / friends filtered by search */}
                  {filteredEntries.map((entry) => {
                    const isTyping =
                      entry.conversationId && typingAll[entry.conversationId]?.length > 0
                    const isSelected = entry.conversationId ? selectedIds.has(entry.conversationId) : false
                    return (
                      <button
                        key={entry.key}
                        onClick={() => {
                          if (selectMode && entry.conversationId) {
                            toggleSelect(entry.conversationId)
                          } else {
                            selectEntry(entry)
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors group',
                          activeConversation === entry.conversationId && !selectMode && 'bg-muted',
                          selectMode && isSelected && 'bg-muted/50',
                        )}
                      >
                        {selectMode && entry.conversationId ? (
                          <Checkbox
                            checked={isSelected}
                            className="shrink-0"
                            tabIndex={-1}
                          />
                        ) : null}
                        <OnlineStatusIndicator
                          status={
                            entry.userId ? getUserStatus(entry.userId, entry.lastSeenAt) : null
                          }
                          size="sm"
                          className="shrink-0"
                        >
                          <TeeAvatarWithFallback
                            skinUrl={
                              entry.skin?.name ? getDDNetSkinUrl(entry.skin.name) : undefined
                            }
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
                              <RoleBadge
                                role={entry.primaryRole || entry.roles}
                                className="text-[10px] px-1 py-0"
                              />
                            </span>
                            {!selectMode && entry.unreadCount > 0 && (
                              <Badge className="text-[10px] h-5 min-w-[20px] justify-center">
                                {entry.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            {isTyping ? (
                              <span className="text-xs text-green-500 italic truncate">
                                {t('typing')}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground truncate">
                                {entry.lastMessage || t('noMessagesPreview')}
                              </span>
                            )}
                            {entry.lastMessageAt && !isTyping && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatTime(entry.lastMessageAt, t('yesterday'))}
                              </span>
                            )}
                          </div>
                        </div>
                        {!selectMode && entry.conversationId && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteConversation(entry.conversationId!)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteConversation(entry.conversationId!)
                              }
                            }}
                            className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                            title={t('deleteConversation')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* Other players section (only when searching) */}
                  {searchQuery.length >= 2 && (searchLoading || otherPlayers.length > 0) && (
                    <>
                      <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                        {t('otherPlayers')}
                      </div>
                      {searchLoading ? (
                        <div className="space-y-2 p-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        otherPlayers.map((player: any) => (
                          <button
                            key={player.id}
                            onClick={() => selectOtherPlayer(player)}
                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                          >
                            <TeeAvatarWithFallback
                              skinUrl={
                                player.ingameStats?.skin?.name
                                  ? getDDNetSkinUrl(player.ingameStats.skin.name)
                                  : undefined
                              }
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="text-sm font-medium truncate">
                                  {player.ingameNick}
                                </span>
                                <RoleBadge
                                  role={player.primaryRole || player.roles}
                                  className="text-[10px] px-1 py-0"
                                />
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </>
                  )}

                  {/* Empty state */}
                  {filteredEntries.length === 0 && otherPlayers.length === 0 && !searchLoading && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      {searchQuery ? (
                        <p>{t('noPlayersFound')}</p>
                      ) : (
                        <>
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          {t('noFriendsYet')}
                          <br />
                          {t('addFriendsToChat')}
                        </>
                      )}
                    </div>
                  )}
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
            <Card className="flex-1 flex flex-col overflow-hidden border-0 rounded-none shadow-none py-0 gap-0 lg:border lg:rounded-xl lg:shadow-sm lg:py-6 lg:gap-6">
              {/* Chat Header */}
              <CardHeader className="shrink-0 mt-4 py-0 border-b px-4 ">
                <div className="flex items-center gap-3 pt-3">
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
                      status={
                        activeOtherUser?.id
                          ? getUserStatus(activeOtherUser.id, activeOtherUser.lastSeenAt)
                          : null
                      }
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
                    <span className="font-medium">{activeOtherUser?.ingameNick || t('unknownUser')}</span>
                    <RoleBadge
                      role={(activeOtherUser as any)?.primaryRole || activeOtherUser?.roles}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </Link>
                </div>
              </CardHeader>

              {/* Messages */}
              <ChatMessages
                scrollKey={messages.length}
                emptyText={t('emptyChat')}
                className="px-3 lg:px-4"
                typingText={typingText}
              >
                {msgLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}
                      >
                        <Skeleton className="h-12 w-48 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  [...messages].reverse().map((msg: any) => {
                    const isMe = msg.sender?.id === currentUserId
                    return (
                      <ChatBubble key={msg.id} isOwn={isMe} isOptimistic={msg._optimistic}>
                        {msg.content && msg.content !== '[image]' && (
                          <p className="text-sm whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                          </p>
                        )}
                        <MessageImages images={msg.images} />
                        <p
                          className={cn(
                            'text-[10px]',
                            isMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                          )}
                        >
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
              <div className="shrink-0 px-3 pb-3 lg:px-4 lg:pb-4">
                <ChatInput
                  onSend={handleSendMessage}
                  placeholder={t('messagePlaceholder')}
                  sending={sending}
                  onTyping={notifyTyping}
                />
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center border-0 rounded-none shadow-none lg:border lg:rounded-xl lg:shadow-sm">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('selectConversation')}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerSearchInput({
  onSearch,
  resetToken,
}: {
  onSearch: (q: string) => void
  resetToken: number
}) {
  const t = useTranslations('chat')
  const [value, setValue] = useState('')

  // Reset local state when parent requests it
  useEffect(() => {
    setValue('')
    onSearch('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken])

  // Debounce: only update parent after 300ms of inactivity
  useEffect(() => {
    const t = setTimeout(() => onSearch(value), 300)
    return () => clearTimeout(t)
  }, [value, onSearch])

  return (
    <div className="relative pb-2">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 h-9 text-sm"
      />
    </div>
  )
}

function formatTime(dateStr: string, yesterdayLabel: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (days === 1) return yesterdayLabel
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
