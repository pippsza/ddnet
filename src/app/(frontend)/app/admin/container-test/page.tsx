'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Play,
  Square,
  Send,
  Terminal,
  MessageSquare,
  Loader2,
  Trash2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STORAGE_KEY = 'container-test-state'

function saveState(sessionId: string, containerId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, containerId }))
  } catch {}
}

function loadState(): { sessionId: string; containerId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export default function ContainerTestPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [containerId, setContainerId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [sending, setSending] = useState(false)
  const [messagesSince, setMessagesSince] = useState(0)
  const [allMessages, setAllMessages] = useState<
    Array<{
      author: string
      text: string
      isServer: boolean
      isOwn: boolean
      timestamp: string
      skin?: string
      delivered?: boolean
    }>
  >([])
  const [loginRequired, setLoginRequired] = useState(false)
  const [loginToken, setLoginToken] = useState('')
  const [loginSending, setLoginSending] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Check for active session on mount
  const { data: activeData, mutate: mutateActive } = useSWR('/api/admin/container-test', fetcher, {
    revalidateOnFocus: true,
  })

  // Restore session: from backend first, then localStorage fallback
  useEffect(() => {
    if (sessionId) return // already have a session

    if (activeData?.session) {
      setSessionId(activeData.session.id)
      setContainerId(activeData.session.containerId)
      saveState(activeData.session.id, activeData.session.containerId)
    } else if (activeData && !activeData.session) {
      // No active session on backend — check localStorage for orphaned container
      const saved = loadState()
      if (saved?.containerId) {
        // We have a containerId from a previous session that might still be running
        setContainerId(saved.containerId)
      }
    }
  }, [activeData, sessionId])

  // Poll for messages
  const { data: msgData } = useSWR(
    sessionId ? `/api/admin/container-test?sessionId=${sessionId}&since=${messagesSince}` : null,
    fetcher,
    { refreshInterval: 1000 },
  )

  // Append new messages + process deliveries + detect login_required
  useEffect(() => {
    if (!msgData) return

    const newMessages = msgData.messages || []
    const deliveries: string[] = msgData.deliveries || []

    if (newMessages.length > 0 || deliveries.length > 0) {
      setAllMessages((prev) => {
        let updated = newMessages.length > 0 ? [...prev, ...newMessages] : [...prev]
        for (const text of deliveries) {
          const idx = updated.findIndex((m) => m.isOwn && !m.delivered && m.text === text)
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], delivered: true }
          }
        }
        return updated
      })
    }
    if (newMessages.length > 0) {
      setMessagesSince(msgData.totalMessages)
    }

    if (msgData.status === 'login_required') {
      setLoginRequired(true)
    }
    if (msgData.status === 'connected' && loginRequired) {
      setLoginRequired(false)
      setLoginToken('')
      setLoginSending(false)
    }
    if (msgData.status === 'login_failed') {
      setLoginSending(false)
      toast.error('Login failed. Check your credentials and try again.')
    }
  }, [msgData])

  // Poll for Docker logs (works even for orphaned containers)
  const { data: logsData } = useSWR(
    containerId ? `/api/admin/container-test/logs?containerId=${containerId}` : null,
    fetcher,
    { refreshInterval: 3000 },
  )
  const logs: string[] = logsData?.logs || []

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const formData = new FormData(form)
      const serverAddress = (formData.get('serverAddress') as string)?.trim()
      const botName = (formData.get('botName') as string)?.trim() || 'TestBot'
      const serverPassword = (formData.get('serverPassword') as string)?.trim() || undefined

      if (!serverAddress) {
        toast.error('Enter server address (IP:Port)')
        return
      }

      // Parse IP:Port
      const parts = serverAddress.split(':')
      if (parts.length !== 2) {
        toast.error('Invalid format. Use IP:Port (e.g., 49.12.97.180:8303)')
        return
      }
      const [serverIp, portStr] = parts
      const serverPort = parseInt(portStr, 10)
      if (!serverIp || isNaN(serverPort)) {
        toast.error('Invalid IP or port')
        return
      }

      setConnecting(true)
      try {
        const res = await fetch('/api/admin/container-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverIp, serverPort, botName, serverPassword }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setSessionId(data.sessionId)
        setContainerId(data.containerId)
        setAllMessages([])
        setMessagesSince(0)
        saveState(data.sessionId, data.containerId)
        mutateActive()
        toast.success('Bot starting...')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to start bot')
      } finally {
        setConnecting(false)
      }
    },
    [mutateActive],
  )

  const handleStop = useCallback(async () => {
    if (!sessionId && !containerId) return
    setStopping(true)
    try {
      // Try sessionId first, fall back to containerId
      let url = '/api/admin/container-test?'
      if (sessionId) url += `sessionId=${sessionId}`
      else if (containerId) url += `containerId=${containerId}`

      const res = await fetch(url, { method: 'DELETE' })

      if (!res.ok && sessionId && containerId) {
        // Session not found — try containerId fallback
        await fetch(`/api/admin/container-test?containerId=${containerId}`, { method: 'DELETE' })
      }

      setSessionId(null)
      setContainerId(null)
      setAllMessages([])
      setMessagesSince(0)
      clearState()
      mutateActive()
      toast.success('Bot stopped')
    } catch {
      toast.error('Failed to stop bot')
    } finally {
      setStopping(false)
    }
  }, [sessionId, containerId, mutateActive])

  const handleLoginSubmit = useCallback(async () => {
    if (!sessionId || !loginToken.trim()) return
    setLoginSending(true)
    try {
      const res = await fetch('/api/admin/container-test/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: `/login ${loginToken.trim()}` }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      // Keep loginSending=true — will be cleared when server responds
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login')
      setLoginSending(false)
    }
  }, [sessionId, loginToken])

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const message = inputRef.current?.value?.trim()
      if (!message || !sessionId) return

      setSending(true)
      try {
        const res = await fetch('/api/admin/container-test/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed')
        }
        if (inputRef.current) inputRef.current.value = ''
        inputRef.current?.focus()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send')
      } finally {
        setSending(false)
      }
    },
    [sessionId],
  )

  const isRunning = !!sessionId
  const hasOrphanContainer = !sessionId && !!containerId
  const botStatus =
    msgData?.status || activeData?.session?.status || (hasOrphanContainer ? 'orphaned' : 'stopped')

  return (
    <div className="space-y-4 overflow-hidden">
      <h1 className="text-2xl font-bold">Container Test</h1>

      {/* Connection Panel */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={
              isRunning
                ? (e) => {
                    e.preventDefault()
                    handleStop()
                  }
                : handleConnect
            }
            className="flex items-end gap-3 flex-wrap"
          >
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-0">Server Address</Label>
              <Input name="serverAddress" placeholder="49.12.97.180:8303" disabled={isRunning} />
            </div>
            <div className="w-40">
              <Label className="mb-0">Bot Name</Label>
              <Input
                name="botName"
                placeholder="TestBot"
                defaultValue="TestBot"
                disabled={isRunning}
              />
            </div>
            <div className="w-40">
              <Label className="mb-0">Password</Label>
              <Input
                name="serverPassword"
                type="password"
                placeholder="Optional"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button type="submit" variant="destructive" disabled={stopping}>
                  {stopping ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Square className="h-4 w-4 mr-1" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button type="submit" disabled={connecting || hasOrphanContainer}>
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Connect
                </Button>
              )}
              {hasOrphanContainer && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={stopping}
                  onClick={handleStop}
                >
                  {stopping ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Stop Orphan
                </Button>
              )}
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
                  botStatus === 'disconnected' && 'bg-red-500 text-white',
                  botStatus === 'orphaned' && 'bg-orange-500 text-white',
                )}
              >
                {botStatus}
              </Badge>
            </div>
          </form>
          {containerId && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Container: {containerId.slice(0, 12)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat + Logs side by side */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ height: 'calc(100vh - 20rem)' }}
      >
        {/* Chat */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Server Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3 overflow-hidden relative">
            <div
              className={cn(
                'flex-1 flex flex-col overflow-hidden',
                loginRequired && 'blur-sm pointer-events-none select-none',
              )}
            >
              <ChatMessages
                scrollKey={allMessages.length}
                emptyText={
                  isRunning ? 'Waiting for messages...' : 'Connect to a server to see chat'
                }
              >
                {allMessages.map((msg, i) => {
                  if (msg.isServer) {
                    return (
                      <ChatBubble
                        key={i}
                        isOwn={false}
                        avatar={
                          <TeeAvatarWithFallback
                            skinUrl={getDDNetSkinUrl('bot')}
                            size="xs"
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
                        <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground italic">
                          {msg.text}
                        </p>
                      </ChatBubble>
                    )
                  }

                  return (
                    <ChatBubble
                      key={i}
                      isOwn={msg.isOwn}
                      status={msg.isOwn ? (msg.delivered ? 'delivered' : 'pending') : undefined}
                      avatar={
                        <TeeAvatarWithFallback
                          skinUrl={getDDNetSkinUrl(msg.skin || 'default')}
                          size="xs"
                          useCustomColors={false}
                          mirrored={msg.isOwn}
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

              <div className="shrink-0 pt-3 border-t">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder={isRunning ? 'Type a message or command...' : 'Connect first'}
                    disabled={!isRunning || sending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend(e)
                      }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={!isRunning || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
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
                    This server requires authentication before you can chat. Enter your login token
                    below.
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginSending || !loginToken.trim()}
                    >
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

        {/* Logs */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Docker Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {containerId ? 'Loading logs...' : 'No container running'}
              </p>
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
                {logs.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      line.includes('Error') || line.includes('error') || line.includes('ERROR')
                        ? 'text-red-400'
                        : line.includes('Warn') || line.includes('warn')
                          ? 'text-yellow-400'
                          : undefined,
                    )}
                  >
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
