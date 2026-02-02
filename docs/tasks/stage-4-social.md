# Stage 4: Social Features

## Overview
Социальные функции: друзья, онлайн статус, чат через бота, приглашения, уведомления.

## Features

### 4.1 Friends System

#### Flow
1. Пользователь ищет друга по нику
2. Отправляет friend request
3. Получатель принимает/отклоняет
4. При принятии - оба добавляются в друзья

#### Коллекция Users - обновить поле friends

```typescript
{
  name: 'friends',
  type: 'array',
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'addedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'nickname',
      type: 'text',
      label: 'Custom Nickname',
    },
  ],
}
```

### 4.2 Online Status

#### Как работает
Используем функцию `findPlayer` из ddnet.js для проверки онлайн статуса.

**Кастомная функция для массива игроков:**

**Файл:** `src/lib/ddnet-helpers.ts`

```typescript
import { findPlayer } from 'ddnet'

interface OnlineStatus {
  name: string
  online: boolean
  server?: {
    ip: string
    port: number
    name: string
    map: string
  }
}

/**
 * Check online status for multiple players
 * @param nicknames - Array of player nicknames to check
 */
export async function findPlayersOnline(nicknames: string[]): Promise<OnlineStatus[]> {
  const results = await Promise.allSettled(
    nicknames.map(async (name) => {
      try {
        const result = await findPlayer(name)
        if (result) {
          return {
            name,
            online: true,
            server: {
              ip: result.ip,
              port: result.port,
              name: result.serverName,
              map: result.map,
            },
          }
        }
        return { name, online: false }
      } catch {
        return { name, online: false }
      }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { name: nicknames[i], online: false }
  )
}

/**
 * Get online friends for a user
 */
export async function getOnlineFriends(friendNicknames: string[]): Promise<OnlineStatus[]> {
  return findPlayersOnline(friendNicknames)
}
```

### 4.3 Real-time Chat

#### Flow
1. Пользователь открывает чат с другом
2. Система проверяет где находится друг (сервер)
3. Запускается бот-чат который подключается к серверу
4. Пользователь пишет сообщение на фронте
5. Бот отправляет whisper другу
6. Бот слушает сообщения от друга
7. Бот передаёт сообщения обратно на фронт

#### Коллекция ChatSessions

**Файл:** `src/collections/ChatSessions.ts`

```typescript
import type { CollectionConfig } from 'payload'

export const ChatSessions: CollectionConfig = {
  slug: 'chat-sessions',
  admin: {
    group: 'Social',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      return {
        or: [
          { initiator: { equals: req.user.id } },
          { target: { equals: req.user.id } },
        ],
      }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      return { initiator: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { initiator: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'initiator',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'target',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'targetNickname',
      type: 'text',
      required: true,
      label: 'Target In-game Nickname',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Connecting', value: 'connecting' },
        { label: 'Active', value: 'active' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'connecting',
    },
    {
      name: 'server',
      type: 'group',
      fields: [
        { name: 'ip', type: 'text' },
        { name: 'port', type: 'number' },
        { name: 'name', type: 'text' },
      ],
    },
    {
      name: 'botContainerId',
      type: 'text',
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'endedAt',
      type: 'date',
    },
  ],
}
```

#### Bot Chat Mode

**Файл:** `apps/bot/src/modes/chat.ts`

```typescript
import { BaseBotMode } from './base.js'
import { BackendApi } from '../api.js'

export class ChatMode extends BaseBotMode {
  readonly name = 'chat'
  readonly description = 'Chat relay between web and game'
  readonly requiredEnv = [
    'SESSION_ID',
    'TARGET_NICK',
    'SERVER_IP',
    'SERVER_PORT',
    'BACKEND_URL',
    'BACKEND_SECRET',
  ]

  private api: BackendApi | null = null
  private messageQueue: string[] = []

  async run(): Promise<void> {
    const { SESSION_ID, TARGET_NICK, SERVER_IP, SERVER_PORT } = this.config

    console.log(`[Chat] Starting chat session ${SESSION_ID}`)
    console.log(`[Chat] Target: ${TARGET_NICK} on ${SERVER_IP}:${SERVER_PORT}`)

    this.api = new BackendApi(this.config.BACKEND_URL, this.config.BACKEND_SECRET)

    const client = this.createClient('ChatBot')

    try {
      await client.connect(SERVER_IP, parseInt(SERVER_PORT))

      // Report connected
      await this.api.updateChatSession(SESSION_ID, 'active')

      // Listen for messages from target
      client.onMessage(async (msg) => {
        if (msg.author.toLowerCase() === TARGET_NICK.toLowerCase()) {
          await this.api!.sendChatMessage(SESSION_ID, {
            from: TARGET_NICK,
            text: msg.text,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Poll for outgoing messages
      await this.pollOutgoingMessages(client, TARGET_NICK, SESSION_ID)

    } catch (error) {
      console.error('[Chat] Error:', error)
      await this.api.updateChatSession(SESSION_ID, 'error')
      throw error
    }
  }

  private async pollOutgoingMessages(
    client: any,
    targetNick: string,
    sessionId: string
  ): Promise<void> {
    while (true) {
      try {
        const messages = await this.api!.getOutgoingMessages(sessionId)

        for (const msg of messages) {
          client.whisper(targetNick, msg.text)
          await this.api!.markMessageSent(sessionId, msg.id)
        }

        await this.sleep(500) // Poll every 500ms
      } catch (error) {
        console.error('[Chat] Poll error:', error)
        await this.sleep(1000)
      }
    }
  }
}
```

### 4.4 Invitations System

#### Game Invites

**API:** `POST /api/invite/send`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { recipientId, gameType, gameId } = await request.json()

  const payload = await getPayload({ config: payloadConfig })

  // Get game info
  const game = await payload.findByID({
    collection: gameType, // 'bingo' or 'races'
    id: gameId,
  })

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Create notification
  await payload.create({
    collection: 'notifications',
    data: {
      recipient: recipientId,
      type: 'game_invite',
      title: `Game Invite`,
      message: `${session.user.name} invited you to ${game.title}`,
      actionUrl: `/${gameType}/${gameId}/join`,
      relatedGame: { relationTo: gameType, value: gameId },
      relatedUser: session.user.id,
      metadata: {
        gameType,
        inviteCode: game.inviteCode,
      },
    },
  })

  return NextResponse.json({ success: true })
}
```

### 4.5 Notifications

#### In-App Notifications Component

**Файл:** `src/components/notifications/NotificationBell.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function NotificationBell() {
  const { data, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
  })

  const unreadCount = data?.docs?.filter(n => !n.isRead).length || 0

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    })
    mutate()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data?.docs?.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead(notification.id)}
            />
          ))}
          {(!data?.docs || data.docs.length === 0) && (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### 4.6 PWA Setup

**Файл:** `public/manifest.json`

```json
{
  "name": "DDNet Bingo",
  "short_name": "Bingo",
  "description": "DDNet Bingo & Race Game",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Файл:** `next.config.mjs` - добавить PWA:

```javascript
import withPWA from 'next-pwa'

const nextConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})({
  // existing config
})

export default nextConfig
```

## Checklist

- [ ] Обновить Users коллекцию (friends field)
- [ ] Создать коллекцию ChatSessions
- [ ] Создать `src/lib/ddnet-helpers.ts` с функциями онлайна
- [ ] Создать бот режим Chat (`apps/bot/src/modes/chat.ts`)
- [ ] API: POST `/api/friends/request`
- [ ] API: POST `/api/friends/accept`
- [ ] API: DELETE `/api/friends/[id]`
- [ ] API: GET `/api/friends/online`
- [ ] API: POST `/api/chat/start`
- [ ] API: POST `/api/chat/send`
- [ ] API: GET `/api/chat/[sessionId]/messages`
- [ ] API: POST `/api/invite/send`
- [ ] API: GET `/api/notifications`
- [ ] API: PATCH `/api/notifications/[id]`
- [ ] Компонент NotificationBell
- [ ] Настроить PWA (manifest.json, service worker)
- [ ] Установить `next-pwa`
