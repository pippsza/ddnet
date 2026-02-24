'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Square, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ChatMessage {
  author: string
  text: string
  isServer: boolean
  isOwn: boolean
  timestamp: string
  status?: 'pending' | 'delivered' | 'failed'
}

const STORAGE_KEY = 'ingame-chat-state'

function saveContainerId(sessionId: string, containerId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, containerId }))
  } catch {}
}

function loadContainerId(sessionId: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data.sessionId === sessionId ? data.containerId : null
  } catch {
    return null
  }
}

function clearContainerId() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

function InGameChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesSinceRef = useRef(0)
  const [stopping, setStopping] = useState(false)
  const [sending, setSending] = useState(false)
  const [chatEnded, setChatEnded] = useState(false)
  const [loginRequired, setLoginRequired] = useState(false)
  const [loginToken, setLoginToken] = useState('')
  const [loginSending, setLoginSending] = useState(false)
  const [targetNick, setTargetNick] = useState<string | null>(null)
  const [serverName, setServerName] = useState<string | null>(null)
  const [containerId, setContainerId] = useState<string | null>(() =>
    sessionId ? loadContainerId(sessionId) : null,
  )

  // Current user data
  const { data: meData } = useSWR('/api/users/me', fetcher)

  // Poll for messages — stable SWR key to prevent re-renders
  const { data: chatData } = useSWR(
    sessionId && !chatEnded
      ? `/api/ingame-chat/poll:${sessionId}`
      : null,
    () => fetch(`/api/ingame-chat?sessionId=${sessionId}&since=${messagesSinceRef.current}`).then((r) => r.json()),
    { refreshInterval: 1000 },
  )

  // Append new messages + process deliveries
  useEffect(() => {
    if (!chatData) return

    // Persist target nick and server name from first poll
    if (chatData.targetNick && !targetNick) {
      setTargetNick(chatData.targetNick)
    }
    if (chatData.serverName && !serverName) {
      setServerName(chatData.serverName)
    }

    if (chatData.messages?.length > 0) {
      // Filter out own messages — already added via optimistic update
      const incoming = chatData.messages.filter((m: ChatMessage) => !m.isOwn)
      if (incoming.length > 0) {
        setMessages((prev) => [...prev, ...incoming])
      }
      messagesSinceRef.current = chatData.totalMessages
    }

    // Process delivery confirmations
    if (chatData.deliveries?.length > 0) {
      setMessages((prev) => {
        const updated = [...prev]
        for (const text of chatData.deliveries) {
          const idx = updated.findIndex((m) => m.isOwn && m.status === 'pending' && m.text === text)
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], status: 'delivered' }
          }
        }
        return updated
      })
    }

    // Handle login required
    if (chatData.status === 'login_required') {
      setLoginRequired(true)
    }
    // Clear login required when connected (successful login)
    if (chatData.status === 'connected' && loginRequired) {
      setLoginRequired(false)
      setLoginToken('')
      setLoginSending(false)
    }
    // Handle login failure — re-enable button so user can retry
    if (chatData.status === 'login_failed') {
      setLoginSending(false)
      toast.error('Login failed. Check your credentials and try again.')
    }

    // Handle disconnect / auto-disconnect
    if (chatData.status === 'disconnected' || chatData.status === 'stopped') {
      setChatEnded(true)
      setLoginRequired(false)
      if (chatData.autoDisconnected) {
        toast.info('Chat ended due to inactivity')
      }
    }
  }, [chatData])
  const { data: friendData } = useSWR(
    targetNick ? `/api/players/${encodeURIComponent(targetNick)}` : null,
    fetcher,
  )

  // Skin data
  const mySkin = meData?.user?.ingameStats?.skin
  const mySkinUrl = mySkin?.name ? getDDNetSkinUrl(mySkin.name) : undefined

  const friendSkin = friendData?.registered?.skin || friendData?.online?.skin
  const friendSkinUrl = friendSkin?.name ? getDDNetSkinUrl(friendSkin.name) : undefined

  const botStatus = chatData?.status || 'connecting'

  const handleSend = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return
      const trimmed = content.trim()

      // Optimistic update — show message immediately with pending status
      const optimisticMsg: ChatMessage = {
        author: meData?.user?.ingameNick || 'You',
        text: trimmed,
        isServer: false,
        isOwn: true,
        timestamp: new Date().toISOString(),
        status: 'pending',
      }
      setMessages((prev) => [...prev, optimisticMsg])

      setSending(true)
      try {
        const res = await fetch('/api/ingame-chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: trimmed }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send')
        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((m) => (m === optimisticMsg ? { ...m, status: 'failed' as const } : m)),
        )
      } finally {
        setSending(false)
      }
    },
    [sessionId, meData?.user?.ingameNick],
  )

  const handleLoginSubmit = useCallback(async () => {
    if (!sessionId || !loginToken.trim()) return
    setLoginSending(true)
    try {
      const res = await fetch('/api/ingame-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: `/login ${loginToken.trim()}` }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      // Keep loginSending=true — will be cleared when server responds
      // (status changes to 'connected' or 'login_failed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login')
      setLoginSending(false)
    }
  }, [sessionId, loginToken])

  const handleDisconnect = useCallback(async () => {
    if (!sessionId && !containerId) return
    setStopping(true)
    try {
      // Try sessionId first, fall back to containerId
      let url = '/api/ingame-chat?'
      if (sessionId) url += `sessionId=${sessionId}`
      if (containerId) url += `${sessionId ? '&' : ''}containerId=${containerId}`

      const res = await fetch(url, { method: 'DELETE' })

      if (!res.ok && sessionId && containerId) {
        // Session not found — try containerId-only fallback
        await fetch(`/api/ingame-chat?containerId=${containerId}`, { method: 'DELETE' })
      }

      setChatEnded(true)
      clearContainerId()
      toast.success('Chat ended')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setStopping(false)
    }
  }, [sessionId, containerId])

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No active chat session.</p>
            <Link href="/app/players" className="text-primary hover:underline mt-2 block">
              Find a friend to chat with
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/players"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              Chat with {targetNick || '...'}
            </h1>
            {serverName && (
              <p className="text-xs text-muted-foreground">{serverName}</p>
            )}
          </div>
          <Badge
            variant={
              botStatus === 'connected'
                ? 'default'
                : botStatus === 'starting'
                  ? 'secondary'
                  : 'outline'
            }
            className={cn(
              botStatus === 'connected' && 'bg-green-500 text-white',
              (botStatus === 'disconnected' || botStatus === 'stopped') && 'bg-red-500 text-white',
            )}
          >
            {chatEnded ? 'ended' : botStatus}
          </Badge>
        </div>
        {!chatEnded && (
          <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={stopping}>
            {stopping ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Square className="h-4 w-4 mr-1" />
            )}
            Disconnect
          </Button>
        )}
        {chatEnded && (
          <Button variant="outline" size="sm" onClick={() => router.push('/app/players')}>
            Back to Players
          </Button>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden relative">
          <div className={cn('flex-1 flex flex-col overflow-hidden', loginRequired && 'blur-sm pointer-events-none select-none')}>
            <ChatMessages scrollKey={messages.length} emptyText="Waiting for connection...">
              {messages.map((msg, i) => {
                if (msg.isServer) {
                  return (
                    <ChatBubble
                      key={i}
                      isOwn={false}
                      avatar={
                        <TeeAvatarWithFallback
                          skinUrl={getDDNetSkinUrl('bot')}
                          size="sm"
                          useCustomColors={false}
                        />
                      }
                      header={
                        <span className="text-xs text-muted-foreground">
                          System{' '}
                          <span className="opacity-60">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground italic">{msg.text}</p>
                    </ChatBubble>
                  )
                }

                return (
                  <ChatBubble
                    key={i}
                    isOwn={msg.isOwn}
                    status={msg.isOwn ? msg.status : undefined}
                    avatar={
                      <TeeAvatarWithFallback
                        skinUrl={msg.isOwn ? mySkinUrl : friendSkinUrl}
                        bodyColor={
                          msg.isOwn ? mySkin?.color_body : (friendSkin?.colorBody ?? friendSkin?.color_body)
                        }
                        feetColor={
                          msg.isOwn ? mySkin?.color_feet : (friendSkin?.colorFeet ?? friendSkin?.color_feet)
                        }
                        size="sm"
                        mirrored={msg.isOwn}
                        useCustomColors={
                          msg.isOwn
                            ? !!(mySkin?.color_body || mySkin?.color_feet)
                            : !!(friendSkin?.colorBody || friendSkin?.color_body || friendSkin?.colorFeet || friendSkin?.color_feet)
                        }
                      />
                    }
                    header={
                      <span className="text-xs text-muted-foreground">
                        {msg.author}{' '}
                        <span className="opacity-60">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    }
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  </ChatBubble>
                )
              })}
            </ChatMessages>

            <ChatInput
              onSend={handleSend}
              placeholder={chatEnded ? '' : 'Type a message...'}
              disabled={chatEnded || botStatus !== 'connected'}
              sending={sending}
              disabledMessage={
                chatEnded
                  ? 'This chat has ended.'
                  : botStatus !== 'connected'
                    ? 'Waiting for connection...'
                    : undefined
              }
            />
          </div>

          {/* Login overlay */}
          {loginRequired && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
              <div className="max-w-sm w-full mx-4 p-6 rounded-lg border border-yellow-500/50 bg-card shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-yellow-500">
                  <Lock className="h-5 w-5" />
                  <h3 className="font-semibold">Server Login Required</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  This server requires authentication before you can chat. Enter your login token below.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleLoginSubmit()
                  }}
                  className="space-y-3"
                >
                  <Input
                    type="password"
                    placeholder="Login token"
                    value={loginToken}
                    onChange={(e) => setLoginToken(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full" disabled={loginSending || !loginToken.trim()}>
                    {loginSending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Lock className="h-4 w-4 mr-1" />
                    )}
                    Send Login
                  </Button>
                </form>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  <p>Your credentials are sent directly to the game server and are not stored.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InGameChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InGameChatContent />
    </Suspense>
  )
}
