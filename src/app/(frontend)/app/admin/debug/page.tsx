'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Bot,
  Server,
  ScrollText,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Container,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Square,
  Trash2,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// --- Log Viewer Component ---

function LogViewer({
  logs,
  className,
}: {
  logs: { timestamp: string; level: string; message: string }[]
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }, [])

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'bg-black/90 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[600px]',
        className,
      )}
    >
      {logs.length === 0 && (
        <span className="text-muted-foreground">No logs yet...</span>
      )}
      {logs.map((entry, i) => (
        <div key={i} className="py-0.5 whitespace-pre-wrap break-all">
          <span className="text-muted-foreground">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>{' '}
          <span
            className={cn(
              'font-semibold',
              entry.level === 'error' && 'text-red-400',
              entry.level === 'warn' && 'text-yellow-400',
              entry.level === 'log' && 'text-green-400',
            )}
          >
            [{entry.level.toUpperCase()}]
          </span>{' '}
          <span className="text-foreground/90">{entry.message}</span>
        </div>
      ))}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
          }}
          className="sticky bottom-0 left-1/2 -translate-x-1/2 bg-primary/80 text-primary-foreground text-xs px-3 py-1 rounded-full"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  )
}

// --- Bots Tab ---

function BotsTab() {
  const { data, isLoading } = useSWR('/api/admin/bots', fetcher, { refreshInterval: 5000 })
  const [expandedBot, setExpandedBot] = useState<string | null>(null)
  const { data: botDetail } = useSWR(
    expandedBot ? `/api/admin/bots/${expandedBot}` : null,
    fetcher,
    { refreshInterval: 3000 },
  )

  const [stopping, setStopping] = useState<string | null>(null)

  const handleStop = async (id: string) => {
    setStopping(id)
    try {
      await fetch(`/api/admin/bots/${id}`, { method: 'DELETE' })
    } finally {
      setStopping(null)
    }
  }

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading bots...</div>

  const bots = data?.bots || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Slots: {data?.activeCount || 0} / {data?.totalSlots || 10}</span>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active bot containers.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bots.map((bot: any) => (
            <Card key={bot.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
                    className="shrink-0"
                  >
                    {expandedBot === bot.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">
                        {bot.name || bot.containerId?.slice(0, 12)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          bot.status === 'running' && 'border-green-500 text-green-500',
                          bot.status === 'starting' && 'border-yellow-500 text-yellow-500',
                          bot.status === 'error' && 'border-red-500 text-red-500',
                        )}
                      >
                        {bot.status}
                      </Badge>
                      {bot.mode && (
                        <Badge variant="secondary" className="text-[10px]">
                          {bot.mode}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {bot.connectedServer?.ip && (
                        <span>
                          {bot.connectedServer.ip}:{bot.connectedServer.port}
                        </span>
                      )}
                      {bot.startedAt && (
                        <span className="ml-2">
                          Started {new Date(bot.startedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStop(bot.id)}
                    disabled={stopping === bot.id}
                  >
                    {stopping === bot.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </Button>
                </div>

                {expandedBot === bot.id && botDetail && (
                  <div className="mt-4 space-y-3">
                    {botDetail.stats && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-muted-foreground">
                          CPU: <span className="text-foreground">{botDetail.stats.cpu}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Memory: <span className="text-foreground">{botDetail.stats.memory}</span>
                        </span>
                      </div>
                    )}
                    <LogViewer
                      logs={(botDetail.logs || []).map((line: string) => ({
                        timestamp: new Date().toISOString(),
                        level: line.includes('ERROR') ? 'error' : line.includes('WARN') ? 'warn' : 'log',
                        message: line,
                      }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Server Logs Tab ---

function ServerLogsTab() {
  const [logs, setLogs] = useState<{ id: number; timestamp: string; level: string; message: string }[]>([])
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all')
  const lastIdRef = useRef(0)

  const { data } = useSWR(
    `/api/admin/debug/server-logs?since=${lastIdRef.current}&level=${filter}&limit=200`,
    fetcher,
    { refreshInterval: 2000 },
  )

  useEffect(() => {
    if (data?.logs?.length) {
      setLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id))
        const newLogs = data.logs.filter((l: any) => !existingIds.has(l.id))
        const merged = [...prev, ...newLogs]
        // Keep last 1000 on client
        return merged.slice(-1000)
      })
      lastIdRef.current = data.latestId
    }
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['all', 'log', 'warn', 'error'] as const).map((level) => (
          <Button
            key={level}
            variant={filter === level ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(level)
              setLogs([])
              lastIdRef.current = 0
            }}
            className={cn(
              'text-xs',
              filter !== level && level === 'error' && 'text-red-400',
              filter !== level && level === 'warn' && 'text-yellow-400',
            )}
          >
            {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLogs([])
            lastIdRef.current = 0
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <LogViewer logs={logs} />
    </div>
  )
}

// --- System Tab ---

function SystemTab() {
  const { data, isLoading } = useSWR('/api/admin/debug/system', fetcher, { refreshInterval: 10000 })

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading system info...</div>
  if (!data) return null

  const { server, process: proc, docker } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Server Memory */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MemoryStick className="h-4 w-4" />
            Server Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span>{formatBytes(server.totalMemory)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span>{formatBytes(server.usedMemory)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Free</span>
            <span>{formatBytes(server.freeMemory)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{
                width: `${Math.round((server.usedMemory / server.totalMemory) * 100)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* CPU */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            CPU
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cores</span>
            <span>{server.cpuCores}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Load (1m)</span>
            <span>{server.loadAverage[0]?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Load (5m)</span>
            <span>{server.loadAverage[1]?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Load (15m)</span>
            <span>{server.loadAverage[2]?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uptime</span>
            <span>{formatUptime(server.uptime)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Node.js Process */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4" />
            Node.js Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">PID</span>
            <span className="font-mono">{proc.pid}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Node</span>
            <span>{proc.nodeVersion}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Heap Used</span>
            <span>{formatBytes(proc.heapUsed)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Heap Total</span>
            <span>{formatBytes(proc.heapTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">RSS</span>
            <span>{formatBytes(proc.rss)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uptime</span>
            <span>{formatUptime(proc.uptime)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Docker */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Container className="h-4 w-4" />
            Docker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {docker ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>{docker.version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Containers</span>
                <span>{docker.containers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Images</span>
                <span>{docker.images}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Docker not available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Docker Events Tab ---

function EventsTab() {
  const [events, setEvents] = useState<any[]>([])
  const sinceRef = useRef(Math.floor(Date.now() / 1000) - 300)

  const { data } = useSWR(
    `/api/admin/debug/docker-events?since=${sinceRef.current}`,
    fetcher,
    { refreshInterval: 3000 },
  )

  useEffect(() => {
    if (data?.events?.length) {
      setEvents((prev) => {
        const existingTimes = new Set(prev.map((e) => `${e.time}-${e.action}-${e.actor}`))
        const newEvents = data.events.filter(
          (e: any) => !existingTimes.has(`${e.time}-${e.action}-${e.actor}`),
        )
        return [...prev, ...newEvents].slice(-200)
      })
    }
    if (data?.serverTime) {
      sinceRef.current = data.serverTime
    }
  }, [data])

  const actionColors: Record<string, string> = {
    start: 'text-green-400',
    stop: 'text-yellow-400',
    die: 'text-red-400',
    create: 'text-blue-400',
    destroy: 'text-red-300',
    kill: 'text-red-500',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {events.length} events
        </span>
        <Button variant="ghost" size="sm" onClick={() => setEvents([])}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="bg-black/90 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[600px] space-y-0.5">
        {events.length === 0 && (
          <span className="text-muted-foreground">No Docker events in the last 5 minutes...</span>
        )}
        {events.map((event, i) => (
          <div key={i} className="py-0.5">
            <span className="text-muted-foreground">
              {new Date(event.time).toLocaleTimeString()}
            </span>{' '}
            <span className={cn('font-semibold', actionColors[event.action] || 'text-foreground')}>
              {event.action}
            </span>{' '}
            <span className="text-foreground/80">{event.actor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main Page ---

export default function DebugPage() {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString())
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug</h1>
        <Badge variant="outline" className="text-xs">
          {currentTime || '\u00A0'}
        </Badge>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">
            <ScrollText className="h-3.5 w-3.5 mr-1.5" />
            Server Logs
          </TabsTrigger>
          <TabsTrigger value="bots">
            <Bot className="h-3.5 w-3.5 mr-1.5" />
            Bots
          </TabsTrigger>
          <TabsTrigger value="system">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            System
          </TabsTrigger>
          <TabsTrigger value="events">
            <HardDrive className="h-3.5 w-3.5 mr-1.5" />
            Docker Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <ServerLogsTab />
        </TabsContent>
        <TabsContent value="bots">
          <BotsTab />
        </TabsContent>
        <TabsContent value="system">
          <SystemTab />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
