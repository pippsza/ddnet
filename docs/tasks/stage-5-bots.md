# Stage 5: Bot System

## Overview
Расширенная система управления ботами: DooD, админка, логи, мониторинг.

## Architecture

### DooD (Docker-out-of-Docker)
Боты запускаются как отдельные Docker контейнеры. Основное приложение управляет контейнерами через Docker API (socket mounting).

```
+------------------+
|   VPS Server     |
|  +------------+  |
|  | Docker     |  |
|  |  +------+  |  |
|  |  | App  |--+--+--> Docker Socket
|  |  +------+  |  |
|  |     |      |  |
|  |     v      |  |
|  |  +------+  |  |
|  |  | Bot1 |  |  |
|  |  +------+  |  |
|  |  +------+  |  |
|  |  | Bot2 |  |  |
|  |  +------+  |  |
|  +------------+  |
+------------------+
```

### Bot Limits
- **MAX_BOTS**: 10 (общий лимит)
- **MAX_CONCURRENT_BOTS**: 4 (для верификации)

## Tasks

### 5.1 Обновить BotManager

**Файл:** `src/services/verification/BotManager.ts`

```typescript
import Docker from 'dockerode'

interface BotInfo {
  containerId: string
  mode: 'verification' | 'race' | 'chat' | 'monitor'
  startedAt: Date
  linkedGame?: string
  linkedUser?: string
}

export class BotManager {
  private docker: Docker
  private activeBots: Map<string, BotInfo> = new Map()
  private maxBots: number
  private useMock: boolean

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' })
    this.maxBots = parseInt(process.env.MAX_BOTS || '10')
    this.useMock = process.env.USE_MOCK_BOT === 'true'
  }

  hasAvailableSlots(): boolean {
    return this.activeBots.size < this.maxBots
  }

  getActiveBotsCount(): number {
    return this.activeBots.size
  }

  getActiveBots(): BotInfo[] {
    return Array.from(this.activeBots.values())
  }

  async startBot(
    mode: BotInfo['mode'],
    env: Record<string, string>,
    options?: { linkedGame?: string; linkedUser?: string }
  ): Promise<string> {
    if (!this.hasAvailableSlots()) {
      throw new Error('No available bot slots')
    }

    if (this.useMock) {
      const mockId = `mock-${Date.now()}`
      this.activeBots.set(mockId, {
        containerId: mockId,
        mode,
        startedAt: new Date(),
        ...options,
      })
      return mockId
    }

    const container = await this.docker.createContainer({
      Image: 'bingo-bot:latest',
      Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
      HostConfig: {
        AutoRemove: true,
        NetworkMode: 'host', // Use host network for game connections
      },
    })

    await container.start()

    const containerId = container.id

    this.activeBots.set(containerId, {
      containerId,
      mode,
      startedAt: new Date(),
      ...options,
    })

    return containerId
  }

  async stopBot(containerId: string): Promise<void> {
    if (this.useMock) {
      this.activeBots.delete(containerId)
      return
    }

    try {
      const container = this.docker.getContainer(containerId)
      await container.stop({ t: 5 })
    } catch (error) {
      console.error(`Failed to stop bot ${containerId}:`, error)
    }

    this.activeBots.delete(containerId)
  }

  async getBotLogs(containerId: string, tail: number = 100): Promise<string[]> {
    if (this.useMock) {
      return ['[Mock] Bot logs not available']
    }

    try {
      const container = this.docker.getContainer(containerId)
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      })

      return logs.toString().split('\n').filter(Boolean)
    } catch (error) {
      console.error(`Failed to get logs for ${containerId}:`, error)
      return []
    }
  }

  async getBotStats(containerId: string): Promise<any> {
    if (this.useMock) {
      return { cpu: 0, memory: 0 }
    }

    try {
      const container = this.docker.getContainer(containerId)
      const stats = await container.stats({ stream: false })
      return {
        cpu: stats.cpu_stats,
        memory: stats.memory_stats,
      }
    } catch (error) {
      console.error(`Failed to get stats for ${containerId}:`, error)
      return null
    }
  }

  async cleanupStale(): Promise<number> {
    let cleaned = 0

    for (const [id, info] of this.activeBots) {
      const age = Date.now() - info.startedAt.getTime()
      const maxAge = 30 * 60 * 1000 // 30 minutes

      if (age > maxAge) {
        await this.stopBot(id)
        cleaned++
      }
    }

    return cleaned
  }
}

// Singleton
let instance: BotManager | null = null

export function getBotManager(): BotManager {
  if (!instance) {
    instance = new BotManager()
  }
  return instance
}
```

### 5.2 Admin API для управления ботами

**Файл:** `src/app/api/admin/bots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session.user?.roles !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await getPayload({ config: payloadConfig })
  const botManager = getBotManager()

  // Get bots from database
  const dbBots = await payload.find({
    collection: 'bots',
    where: { status: { in: ['starting', 'running'] } },
    limit: 100,
  })

  // Get active bots from manager
  const activeBots = botManager.getActiveBots()

  return NextResponse.json({
    totalSlots: parseInt(process.env.MAX_BOTS || '10'),
    activeCount: activeBots.length,
    bots: dbBots.docs.map(bot => ({
      ...bot,
      isActive: activeBots.some(a => a.containerId === bot.containerId),
    })),
  })
}
```

**Файл:** `src/app/api/admin/bots/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (session.user?.roles !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await getPayload({ config: payloadConfig })
  const botManager = getBotManager()

  const bot = await payload.findByID({
    collection: 'bots',
    id: params.id,
  })

  if (!bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  // Get logs
  const logs = await botManager.getBotLogs(bot.containerId, 200)

  // Get stats
  const stats = await botManager.getBotStats(bot.containerId)

  return NextResponse.json({
    bot,
    logs,
    stats,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (session.user?.roles !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await getPayload({ config: payloadConfig })
  const botManager = getBotManager()

  const bot = await payload.findByID({
    collection: 'bots',
    id: params.id,
  })

  if (!bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  // Stop container
  await botManager.stopBot(bot.containerId)

  // Update database
  await payload.update({
    collection: 'bots',
    id: params.id,
    data: {
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ success: true })
}
```

### 5.3 Admin UI для ботов

**Файл:** `src/app/(frontend)/admin/bots/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminBotsPage() {
  const { data, mutate } = useSWR('/api/admin/bots', fetcher, {
    refreshInterval: 5000,
  })

  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [botDetails, setBotDetails] = useState<any>(null)

  const stopBot = async (id: string) => {
    await fetch(`/api/admin/bots/${id}`, { method: 'DELETE' })
    mutate()
  }

  const viewLogs = async (id: string) => {
    setSelectedBot(id)
    const res = await fetch(`/api/admin/bots/${id}`)
    const data = await res.json()
    setBotDetails(data)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bot Management</h1>
        <div className="text-sm text-muted-foreground">
          Active: {data?.activeCount || 0} / {data?.totalSlots || 10}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Server</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.bots?.map(bot => (
            <TableRow key={bot.id}>
              <TableCell>{bot.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{bot.mode}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={bot.status === 'running' ? 'default' : 'secondary'}
                >
                  {bot.status}
                </Badge>
              </TableCell>
              <TableCell>
                {bot.connectedServer?.ip}:{bot.connectedServer?.port}
              </TableCell>
              <TableCell>
                {new Date(bot.startedAt).toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => viewLogs(bot.id)}
                  >
                    Logs
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => stopBot(bot.id)}
                    disabled={bot.status !== 'running'}
                  >
                    Stop
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bot Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <pre className="text-xs font-mono bg-muted p-4 rounded">
              {botDetails?.logs?.join('\n')}
            </pre>
          </ScrollArea>
          {botDetails?.stats && (
            <div className="mt-4 text-sm">
              <p>CPU: {JSON.stringify(botDetails.stats.cpu)}</p>
              <p>Memory: {JSON.stringify(botDetails.stats.memory)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### 5.4 Cleanup Job

**Файл:** `src/jobs/botCleanup.ts`

```typescript
import { getBotManager } from '@/services/verification/BotManager'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

/**
 * Cleanup stale bots
 * Run periodically (e.g., every 5 minutes)
 */
export async function cleanupStaleBots() {
  const botManager = getBotManager()
  const payload = await getPayload({ config: payloadConfig })

  // Cleanup stale containers
  const cleaned = await botManager.cleanupStale()
  console.log(`[BotCleanup] Cleaned ${cleaned} stale bots`)

  // Sync database with actual running containers
  const dbBots = await payload.find({
    collection: 'bots',
    where: { status: { equals: 'running' } },
    limit: 100,
  })

  const activeBots = botManager.getActiveBots()
  const activeIds = new Set(activeBots.map(b => b.containerId))

  for (const dbBot of dbBots.docs) {
    if (!activeIds.has(dbBot.containerId)) {
      // Bot in DB but not running - mark as stopped
      await payload.update({
        collection: 'bots',
        id: dbBot.id,
        data: {
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
        },
      })
    }
  }
}
```

### 5.5 Docker Setup

**Файл:** `docker-compose.yml` - добавить для DooD:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URI=mongodb://mongo:27017/ddnet
    volumes:
      # DooD: mount docker socket
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

**Файл:** `apps/bot/Dockerfile` - убедиться что готов:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
CMD ["node", "dist/index.js"]
```

## Checklist

- [ ] Обновить BotManager с полным функционалом
- [ ] Создать API: GET `/api/admin/bots`
- [ ] Создать API: GET `/api/admin/bots/[id]`
- [ ] Создать API: DELETE `/api/admin/bots/[id]`
- [ ] Создать Admin UI страницу для ботов
- [ ] Создать job для cleanup (`src/jobs/botCleanup.ts`)
- [ ] Настроить docker-compose для DooD
- [ ] Убедиться что bot Dockerfile готов
- [ ] Добавить middleware проверки admin роли
- [ ] Написать тесты для BotManager
