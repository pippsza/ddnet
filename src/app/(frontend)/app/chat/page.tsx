'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { cn } from '@/lib/utils'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const conversations = convData?.conversations || []
  const messages = msgData?.messages || []
  const participants = msgData?.participants || []

  // Find current user from participants
  const currentUserId = conversations[0]?.participants?.find(
    (p: any) => p?.id !== conversations[0]?.otherUser?.id,
  )?.id

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Refetch conversations when switching to mark-as-read
  useEffect(() => {
    if (activeConversation) {
      const timer = setTimeout(() => mutateConversations(), 1000)
      return () => clearTimeout(timer)
    }
  }, [activeConversation, mutateConversations])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !activeConversation) return
    setSending(true)
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation,
          content: messageInput,
        }),
      })
      setMessageInput('')
      mutateMessages()
      mutateConversations()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const activeOtherUser = activeConversation
    ? conversations.find((c: any) => c.id === activeConversation)?.otherUser
    : null

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        {/* Conversations List */}
        <div
          className={cn(
            'w-full md:w-80 md:shrink-0 flex flex-col',
            activeConversation ? 'hidden md:flex' : 'flex',
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
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length > 0 ? (
                <div className="divide-y">
                  {conversations.map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors',
                        activeConversation === conv.id && 'bg-muted',
                      )}
                    >
                      <div className="shrink-0">
                        {conv.otherUser?.skin ? (
                          <TeeAvatarWithFallback
                            skinUrl={getDDNetSkinUrl(conv.otherUser.skin)}
                            size="xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {conv.otherUser?.ingameNick?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {conv.otherUser?.ingameNick || 'Unknown'}
                          </span>
                          {conv.unreadCount > 0 && (
                            <Badge className="text-[10px] h-5 min-w-[20px] justify-center">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage || 'No messages yet'}
                          </span>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No conversations yet.
                  <br />
                  Start one from a player&apos;s profile!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            'flex-1 flex flex-col',
            !activeConversation ? 'hidden md:flex' : 'flex',
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
                    className="md:hidden"
                    onClick={() => setActiveConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {activeOtherUser?.skin ? (
                    <TeeAvatarWithFallback
                      skinUrl={getDDNetSkinUrl(activeOtherUser.skin)}
                      size="xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {activeOtherUser?.ingameNick?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="font-medium">
                    {activeOtherUser?.ingameNick || 'Unknown'}
                  </span>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                        <Skeleton className="h-12 w-48 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  // Messages are returned newest-first, reverse for display
                  [...messages].reverse().map((msg: any) => {
                    const isMe = msg.sender?.id === currentUserId
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-lg px-3 py-2 space-y-1',
                            isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted border',
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={cn(
                            'text-[10px]',
                            isMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                          )}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Say hello!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Message Input */}
              <div className="shrink-0 border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={sending || !messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
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
