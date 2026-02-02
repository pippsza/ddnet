# Libraries Integration

## Overview
Интеграция трёх основных библиотек: ddnet.js, TeeAssembler-2.0, teeworlds-library-ts.

---

## 1. DDNet.js

**Репозиторий:** https://github.com/Sans3108/ddnet
**Документация:** https://ddnet.js.org/
**NPM:** `pnpm add ddnet`

### Основные классы

#### Player
```typescript
import { Player } from 'ddnet'

const player = await Player.new('PlayerName')

// Данные игрока
player.name                    // string - имя
player.globalLeaderboard       // очки в глобальном рейтинге
player.finishes                // история прохождений
player.serverTypes             // статистика по категориям (Novice, Brutal, etc.)
```

#### Map
```typescript
import { Map } from 'ddnet'

const map = await Map.new('Kobra 4')

map.name           // string
map.type           // string (Brutal, Novice, etc.)
map.difficulty     // number (stars)
map.points         // number
map.mappers        // string[] - авторы
map.finishes       // рекорды
```

#### findPlayer (онлайн статус)
```typescript
import { findPlayer } from 'ddnet'

const status = await findPlayer('PlayerName')
// null если оффлайн, или:
// { ip, port, serverName, map, ... }
```

### Кастомные хелперы

**Файл:** `src/lib/ddnet-helpers.ts`

```typescript
import { Player, Map, findPlayer } from 'ddnet'

// Типы
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

interface MapInfo {
  name: string
  type: string
  difficulty: number
  points: number
}

/**
 * Найти онлайн статус для массива игроков
 */
export async function findPlayersOnline(nicknames: string[]): Promise<OnlineStatus[]> {
  const results = await Promise.allSettled(
    nicknames.map(async (name) => {
      const result = await findPlayer(name)
      return {
        name,
        online: !!result,
        server: result ? {
          ip: result.ip,
          port: result.port,
          name: result.serverName,
          map: result.map,
        } : undefined,
      }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { name: nicknames[i], online: false }
  )
}

/**
 * Получить данные игрока с кэшированием
 */
const playerCache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

export async function getPlayerData(name: string) {
  const cached = playerCache.get(name)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const player = await Player.new(name)
  const data = {
    name: player.name,
    points: player.globalLeaderboard?.completionist?.points || 0,
    rank: player.globalLeaderboard?.completionist?.rank,
    serverTypes: player.serverTypes,
    finishes: player.finishes,
  }

  playerCache.set(name, { data, expires: Date.now() + CACHE_TTL })
  return data
}

/**
 * Получить карты по категории
 * Note: DDNet API не предоставляет прямой эндпоинт, используем releases
 */
export async function getMapsByCategory(category: string): Promise<MapInfo[]> {
  // Fetch from DDNet releases API
  const response = await fetch(`https://ddnet.org/releases/maps.json`)
  const maps = await response.json()

  return maps
    .filter((m: any) => m.type?.toLowerCase() === category.toLowerCase())
    .map((m: any) => ({
      name: m.name,
      type: m.type,
      difficulty: m.stars || 0,
      points: m.points || 0,
    }))
}

/**
 * Проверить прошёл ли игрок карту после определённого времени
 */
export async function hasFinishedMapAfter(
  playerName: string,
  mapName: string,
  afterTime: Date
): Promise<boolean> {
  const player = await Player.new(playerName)

  for (const finish of player.finishes || []) {
    if (
      finish.mapName?.toLowerCase() === mapName.toLowerCase() &&
      new Date(finish.timestamp) > afterTime
    ) {
      return true
    }
  }

  return false
}

/**
 * Получить последние финиши игрока
 */
export async function getRecentFinishes(playerName: string, limit: number = 10) {
  const player = await Player.new(playerName)

  return (player.finishes || [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

/**
 * Получить информацию о скине игрока
 */
export async function getPlayerSkin(playerName: string) {
  const player = await Player.new(playerName)

  // DDNet не предоставляет прямо данные скина через API
  // Но можно получить из последней игровой сессии через status API

  return {
    name: player.name,
    // Placeholder - нужно проверить есть ли такие данные в API
    skinUrl: `https://ddnet.org/skins/skin/default.png`,
    bodyColor: 0,
    feetColor: 0,
  }
}
```

### API Route для DDNet данных

**Файл:** `src/app/api/ddnet/player/[name]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPlayerData } from '@/lib/ddnet-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const data = await getPlayerData(params.name)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Player not found' },
      { status: 404 }
    )
  }
}
```

---

## 2. TeeAssembler-2.0

**Репозиторий:** https://github.com/AlexIsTheGuy/TeeAssembler-2.0
**NPM:** Нет npm пакета, нужно использовать напрямую

### Установка

```bash
# Скачать и положить в public/
curl -o public/js/teeassembler.min.js https://raw.githubusercontent.com/AlexIsTheGuy/TeeAssembler-2.0/main/TeeAssembler.min.js
```

Или использовать CDN в компоненте.

### React Компонент

**Файл:** `src/components/tee/TeeAvatar.tsx`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface TeeAvatarProps {
  skinUrl?: string
  bodyColor?: number
  feetColor?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  lookAtCursor?: boolean
  className?: string
}

const SIZES = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const DEFAULT_SKIN = 'https://ddnet.org/skins/skin/default.png'

declare global {
  interface Window {
    TeeAssembler: any
  }
}

export function TeeAvatar({
  skinUrl,
  bodyColor = 0,
  feetColor = 0,
  size = 'md',
  lookAtCursor = false,
  className = '',
}: TeeAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const teeRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const pixelSize = SIZES[size]

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.TeeAssembler) return

    // Cleanup previous instance
    if (teeRef.current) {
      try {
        teeRef.current.unbindContainer(true)
      } catch {}
    }

    try {
      const tee = new window.TeeAssembler.Tee({
        container: containerRef.current,
        imageLink: error ? DEFAULT_SKIN : (skinUrl || DEFAULT_SKIN),
        bodyColor: bodyColor,
        feetColor: feetColor,
        colorFormat: 'code',
      })

      teeRef.current = tee

      if (lookAtCursor) {
        tee.lookAtCursor()
      }
    } catch (e) {
      console.error('TeeAssembler error:', e)
      setError(true)
    }

    return () => {
      if (teeRef.current) {
        try {
          teeRef.current.unbindContainer(true)
        } catch {}
      }
    }
  }, [loaded, skinUrl, bodyColor, feetColor, lookAtCursor, error])

  return (
    <>
      <Script
        src="/js/teeassembler.min.js"
        onLoad={() => setLoaded(true)}
        strategy="lazyOnload"
      />
      <div
        ref={containerRef}
        className={`tee-avatar inline-block ${className}`}
        style={{
          width: pixelSize,
          height: pixelSize,
          minWidth: pixelSize,
          minHeight: pixelSize,
        }}
      />
    </>
  )
}
```

### Использование

```tsx
// Базовое использование
<TeeAvatar skinUrl="https://ddnet.org/skins/skin/bluekitty.png" />

// С цветами (формат code из Teeworlds)
<TeeAvatar
  skinUrl="https://ddnet.org/skins/skin/default.png"
  bodyColor={5288960}
  feetColor={255}
  size="lg"
/>

// С отслеживанием курсора
<TeeAvatar
  skinUrl={user.skinUrl}
  lookAtCursor
  size="xl"
/>
```

### Цвета Teeworlds

Teeworlds использует собственный формат цветов (code). Для конвертации:

```typescript
// HSL to Teeworlds Code
function hslToTwCode(h: number, s: number, l: number): number {
  // h: 0-360, s: 0-100, l: 0-100
  const twH = Math.floor(h / 360 * 255)
  const twS = Math.floor(s / 100 * 255)
  const twL = Math.floor(l / 100 * 255)
  return (twH << 16) | (twS << 8) | twL
}

// Teeworlds Code to HSL
function twCodeToHsl(code: number): { h: number; s: number; l: number } {
  const twH = (code >> 16) & 0xFF
  const twS = (code >> 8) & 0xFF
  const twL = code & 0xFF
  return {
    h: Math.floor(twH / 255 * 360),
    s: Math.floor(twS / 255 * 100),
    l: Math.floor(twL / 255 * 100),
  }
}
```

---

## 3. Teeworlds-library-ts

**Репозиторий:** https://github.com/swarfeya/teeworlds-library-ts
**NPM:** `pnpm add teeworlds` (в apps/bot)

### Базовое использование

```typescript
import { Client } from 'teeworlds'

const client = new Client('127.0.0.1', 8303, 'BotName', {
  identity: {
    name: 'BotName',
    clan: 'DDNet',
    skin: 'default',
  },
  timeout: 10000,
})

client.on('connected', () => {
  console.log('Connected!')
})

client.on('message', (msg) => {
  console.log(`${msg.author.name}: ${msg.message}`)
})

client.on('disconnect', (reason) => {
  console.log('Disconnected:', reason)
})

client.connect()
```

### Доступные события

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Успешное подключение | - |
| `disconnect` | Отключение | reason: string |
| `message` | Сообщение в чате | { author, message, team, clientId } |
| `emote` | Эмоция игрока | { clientId, emote } |
| `broadcast` | Broadcast сообщение | message: string |
| `motd` | Message of the day | message: string |
| `kill` | Смерть игрока | { killer, victim, weapon } |
| `snapshot` | Снимок состояния | snapshot data |
| `map_details` | Информация о карте | { name, sha256, size } |

### Методы для действий

```typescript
// Чат
client.game.Say('Hello!')           // Обычный чат
client.game.Say('Team msg', true)   // Командный чат

// Whisper (через команду)
client.game.Say(`/w "PlayerName" Your message`)

// Голосование
client.game.Vote(true)              // F3
client.game.Vote(false)             // F4
client.game.CallVoteOption('map_name', 'reason')  // Вотать карту

// Команда/действия
client.game.SetTeam(0)              // Red team
client.game.SetTeam(1)              // Blue team
client.game.Kill()                  // Suicide
client.game.Emote(0)                // Emote (0-5)

// Движение (для более сложных ботов)
client.movement.RunLeft()
client.movement.RunRight()
client.movement.Jump()
client.movement.Fire()
client.movement.Hook()
```

### Получение данных игроков

```typescript
// Через snapshot
client.on('snapshot', () => {
  const players = client.SnapshotUnpacker.AllObjClientInfo

  for (const player of players) {
    console.log({
      id: player.clientId,
      name: player.name,
      clan: player.clan,
      country: player.country,
      skin: player.skin,
    })
  }
})
```

### Wrapper для проекта

**Файл:** `apps/bot/src/client.ts` (уже существует)

Обёртка упрощает работу:
- `connect(ip, port)` - Promise-based подключение
- `findPlayer(nickname)` - Поиск игрока
- `whisper(nick, message)` - Whisper сообщение
- `onMessage(handler)` - Подписка на сообщения
- `getPlayers()` - Список игроков

---

## API References

### DDNet Official API

| Endpoint | Description |
|----------|-------------|
| `https://ddnet.org/players/?json2={name}` | Данные игрока |
| `https://ddnet.org/maps/?json` | Список всех карт |
| `https://ddnet.org/releases/maps.json` | Карты с деталями |
| `https://ddnet.org/status/` | Статус серверов |

### Пример запроса данных игрока
```bash
curl "https://ddnet.org/players/?json2=Sans3108"
```

### Пример ответа
```json
{
  "player": "Sans3108",
  "points": {
    "total": 12345,
    "points": {...},
    "rank": 100
  },
  "types": {
    "Novice": { "points": 100, "rank": 50 },
    "Brutal": { "points": 500, "rank": 200 }
  },
  "activity": [...],
  "last_finishes": [...]
}
```
