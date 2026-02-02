# Stage 1: Foundation

## Overview
Базовая инфраструктура проекта, настройка библиотек и коллекций.

## Tasks

### 1.1 Установка и настройка библиотек

#### 1.1.1 Установить ddnet.js
```bash
pnpm add ddnet
```

**Использование:**
```typescript
import { Player, Map } from 'ddnet'

// Получить данные игрока
const player = await Player.new('PlayerName')
console.log(player.globalLeaderboard.completionist?.points)

// Получить данные карты
const map = await Map.new('Kobra 4')
console.log(map.difficulty, map.points)
```

#### 1.1.2 Создать хелпер для массового поиска игроков
DDNet API имеет только `findPlayer` для одного игрока. Нужно создать функцию для массива:

**Файл:** `src/lib/ddnet-helpers.ts`
```typescript
import { findPlayer as ddnetFindPlayer } from 'ddnet'

interface PlayerOnlineStatus {
  name: string
  online: boolean
  server?: {
    ip: string
    port: number
    name: string
  }
}

/**
 * Find multiple players online status
 * Uses DDNet API to check each player
 */
export async function findPlayers(nicknames: string[]): Promise<PlayerOnlineStatus[]> {
  const results = await Promise.allSettled(
    nicknames.map(async (name) => {
      const result = await ddnetFindPlayer(name)
      return {
        name,
        online: result !== null,
        server: result ? {
          ip: result.ip,
          port: result.port,
          name: result.serverName,
        } : undefined,
      }
    })
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      name: nicknames[index],
      online: false,
    }
  })
}

/**
 * Get player's recent finishes for a specific map
 */
export async function getPlayerMapFinish(playerName: string, mapName: string) {
  const player = await Player.new(playerName)
  // Filter finishes for specific map
  return player.finishes?.filter(f => f.mapName === mapName) || []
}

/**
 * Check if player finished a map after specific timestamp
 */
export async function hasFinishedAfter(
  playerName: string,
  mapName: string,
  afterTimestamp: Date
): Promise<boolean> {
  const finishes = await getPlayerMapFinish(playerName, mapName)
  return finishes.some(f => new Date(f.timestamp) > afterTimestamp)
}
```

#### 1.1.3 Создать TeeAssembler компонент

**Файл:** `src/components/tee/TeeAvatar.tsx`
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import TeeAssembler from 'teeassembler-2.0'

interface TeeAvatarProps {
  skinUrl?: string
  bodyColor?: number
  feetColor?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  lookAtCursor?: boolean
  fallbackSkin?: string
  className?: string
}

const SIZES = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const DEFAULT_SKIN = 'https://ddnet.org/skins/skin/default.png'

export function TeeAvatar({
  skinUrl,
  bodyColor = 0,
  feetColor = 0,
  size = 'md',
  lookAtCursor = false,
  fallbackSkin = DEFAULT_SKIN,
  className = '',
}: TeeAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [teeInstance, setTeeInstance] = useState<any>(null)

  const pixelSize = SIZES[size]

  useEffect(() => {
    if (!containerRef.current) return

    const instance = new TeeAssembler.Tee({
      container: containerRef.current,
      imageLink: error ? fallbackSkin : (skinUrl || fallbackSkin),
      bodyColor,
      feetColor,
      colorFormat: 'code',
    })

    setTeeInstance(instance)

    // Handle skin load error
    instance.getTeeImage().catch(() => {
      setError(true)
    })

    if (lookAtCursor) {
      instance.lookAtCursor()
    }

    return () => {
      instance.unbindContainer(true)
    }
  }, [skinUrl, bodyColor, feetColor, error, fallbackSkin, lookAtCursor])

  return (
    <div
      ref={containerRef}
      className={`tee-avatar ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        minWidth: pixelSize,
        minHeight: pixelSize,
      }}
    />
  )
}
```

**Использование:**
```tsx
<TeeAvatar
  skinUrl="https://ddnet.org/skins/skin/bluekitty.png"
  bodyColor={5288960}
  feetColor={255}
  size="lg"
  lookAtCursor
/>
```

### 1.2 Обновить коллекции

#### 1.2.1 Добавить коллекцию Bots

**Файл:** `src/collections/Bots.ts`
```typescript
import type { CollectionConfig } from 'payload'

export const Bots: CollectionConfig = {
  slug: 'bots',
  admin: {
    useAsTitle: 'name',
    group: 'System',
  },
  access: {
    read: ({ req }) => req.user?.roles === 'admin',
    create: ({ req }) => req.user?.roles === 'admin',
    update: ({ req }) => req.user?.roles === 'admin',
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Bot Name',
    },
    {
      name: 'containerId',
      type: 'text',
      required: true,
      unique: true,
      label: 'Docker Container ID',
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Verification', value: 'verification' },
        { label: 'Race', value: 'race' },
        { label: 'Chat', value: 'chat' },
        { label: 'Monitor', value: 'monitor' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Starting', value: 'starting' },
        { label: 'Running', value: 'running' },
        { label: 'Stopping', value: 'stopping' },
        { label: 'Stopped', value: 'stopped' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'starting',
    },
    {
      name: 'connectedServer',
      type: 'group',
      fields: [
        { name: 'ip', type: 'text' },
        { name: 'port', type: 'number' },
        { name: 'name', type: 'text' },
      ],
    },
    {
      name: 'linkedGame',
      type: 'relationship',
      relationTo: ['bingo', 'races'],
      label: 'Linked Game',
    },
    {
      name: 'linkedUser',
      type: 'relationship',
      relationTo: 'users',
      label: 'Linked User',
    },
    {
      name: 'logs',
      type: 'array',
      fields: [
        { name: 'timestamp', type: 'date', required: true },
        { name: 'level', type: 'select', options: ['info', 'warn', 'error'] },
        { name: 'message', type: 'text', required: true },
      ],
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'stoppedAt',
      type: 'date',
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Additional Metadata',
    },
  ],
}
```

#### 1.2.2 Добавить коллекцию Races

**Файл:** `src/collections/Races.ts`
```typescript
import type { CollectionConfig } from 'payload'
import { DDNET_CATEGORIES, GAME_STATUSES } from '@/lib/ddnet-constants'

export const Races: CollectionConfig = {
  slug: 'races',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'currentRound', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => req.user?.roles === 'admin' || req.user?.roles === 'moderator',
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Solo', value: 'solo' },
        { label: 'Multiplayer (2-4 players)', value: 'multiplayer' },
      ],
      defaultValue: 'multiplayer',
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      label: 'Public Game',
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: DDNET_CATEGORIES,
    },
    {
      name: 'totalRounds',
      type: 'number',
      required: true,
      min: 1,
      max: 20,
      defaultValue: 5,
      label: 'Rounds to Win',
    },
    {
      name: 'currentRound',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'currentMap',
      type: 'text',
      label: 'Current Map Being Played',
    },
    {
      name: 'server',
      type: 'group',
      fields: [
        { name: 'ip', type: 'text', required: true },
        { name: 'port', type: 'number', required: true },
        { name: 'name', type: 'text' },
      ],
    },
    {
      name: 'players',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 4,
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'ingameNick',
          type: 'text',
          required: true,
        },
        {
          name: 'roundsWon',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'isReady',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'rounds',
      type: 'array',
      label: 'Round History',
      fields: [
        {
          name: 'roundNumber',
          type: 'number',
          required: true,
        },
        {
          name: 'mapName',
          type: 'text',
          required: true,
        },
        {
          name: 'winner',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'finishTime',
          type: 'number',
          label: 'Finish Time (seconds)',
        },
        {
          name: 'completedAt',
          type: 'date',
        },
      ],
    },
    {
      name: 'winner',
      type: 'relationship',
      relationTo: 'users',
      label: 'Race Winner',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: GAME_STATUSES,
      defaultValue: 'waiting',
    },
    {
      name: 'botId',
      type: 'text',
      label: 'Monitoring Bot Container ID',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'completedAt',
      type: 'date',
    },
  ],
}
```

#### 1.2.3 Добавить коллекцию Notifications

**Файл:** `src/collections/Notifications.ts`
```typescript
import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    group: 'System',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { recipient: { equals: req.user.id } }
    },
    create: () => true, // System creates
    update: ({ req }) => {
      if (!req.user) return false
      return { recipient: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { recipient: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Game Invite', value: 'game_invite' },
        { label: 'Friend Request', value: 'friend_request' },
        { label: 'Game Started', value: 'game_started' },
        { label: 'Game Ended', value: 'game_ended' },
        { label: 'Achievement', value: 'achievement' },
        { label: 'System', value: 'system' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'text',
      required: true,
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'actionUrl',
      type: 'text',
      label: 'Action Link',
    },
    {
      name: 'relatedGame',
      type: 'relationship',
      relationTo: ['bingo', 'races'],
    },
    {
      name: 'relatedUser',
      type: 'relationship',
      relationTo: 'users',
      label: 'From User',
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
}
```

#### 1.2.4 Добавить коллекцию FriendRequests

**Файл:** `src/collections/FriendRequests.ts`
```typescript
import type { CollectionConfig } from 'payload'

export const FriendRequests: CollectionConfig = {
  slug: 'friend-requests',
  admin: {
    group: 'Social',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      return {
        or: [
          { sender: { equals: req.user.id } },
          { recipient: { equals: req.user.id } },
        ],
      }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      return { recipient: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return {
        or: [
          { sender: { equals: req.user.id } },
          { recipient: { equals: req.user.id } },
        ],
      }
    },
  },
  fields: [
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'message',
      type: 'text',
      label: 'Optional Message',
    },
  ],
}
```

### 1.3 Обновить переменные окружения

**Добавить в `.env`:**
```env
# Bot Configuration
MAX_BOTS=10
MAX_CONCURRENT_BOTS=4

# Bingo Configuration
BINGO_POLL_INTERVAL_MS=5000
MAX_ACTIVE_GAMES_PER_USER=1

# Race Configuration
RACE_SERVERS=["ip:port"]

# Verification Servers (separate from race)
VERIFICATION_SERVERS=["ip:port"]
VERIFICATION_TTL_MS=600000

# DDNet API (optional, if needed for rate limiting)
DDNET_API_RATE_LIMIT=100
```

### 1.4 Обновить payload.config.ts

Добавить новые коллекции:
```typescript
import { Bots } from './collections/Bots'
import { Races } from './collections/Races'
import { Notifications } from './collections/Notifications'
import { FriendRequests } from './collections/FriendRequests'

// В конфиг:
collections: [
  Users,
  Media,
  Bingo,
  Races, // новая
  Bots, // новая
  Notifications, // новая
  FriendRequests, // новая
  Articles,
  ForumPosts,
  Support,
  Servers,
  VerificationRequests,
],
```

## Checklist

- [ ] Установить ddnet.js (`pnpm add ddnet`)
- [ ] Создать `src/lib/ddnet-helpers.ts`
- [ ] Создать `src/components/tee/TeeAvatar.tsx`
- [ ] Создать коллекцию `Bots`
- [ ] Создать коллекцию `Races`
- [ ] Создать коллекцию `Notifications`
- [ ] Создать коллекцию `FriendRequests`
- [ ] Обновить `.env` с новыми переменными
- [ ] Обновить `payload.config.ts`
- [ ] Запустить `pnpm generate:types`
- [ ] Проверить что все типы корректны

## Notes

- DDNet API имеет rate limits, нужно кэшировать данные где возможно
- TeeAssembler работает только на клиенте (use client)
- Для массового поиска игроков использовать Promise.allSettled для graceful handling
