# Stage 3: Race Mode

## Overview
Режим Race: игроки соревнуются на картах DDNet. Бот мониторит сервер, отслеживает финиши в чате и подтверждает через DDNet API.

## Game Rules

### Режимы
- **Solo**: 1 игрок, играет за время/рекорды
- **Multiplayer**: 2-4 игрока, соревнуются кто первый финиширует

### Flow игры
1. Создатель создаёт Race game и выбирает сервер
2. Игроки присоединяются и заходят на сервер
3. Игроки вотают карту (или бот)
4. Бот мониторит чат сервера
5. При сообщении о финише - бот проверяет через DDNet API
6. Победитель раунда засчитывается
7. Следующий раунд - новая карта
8. Победа - достижение N раундов

### Защита от читов
- Бот слушает чат сервера на сообщения типа "PlayerName finished in XX:XX"
- После получения сообщения - проверка через DDNet API что игрок действительно финишировал
- Это предотвращает фейковые сообщения от игроков

## Tasks

### 3.1 Создать режим бота для Race

**Файл:** `apps/bot/src/modes/race.ts`

```typescript
import { BaseBotMode } from './base.js'
import { BackendApi } from '../api.js'

/**
 * Race mode - monitors server for finishes and reports to backend
 */
export class RaceMode extends BaseBotMode {
  readonly name = 'race'
  readonly description = 'Monitor server for race finishes'
  readonly requiredEnv = [
    'RACE_ID',
    'SERVER_IP',
    'SERVER_PORT',
    'PLAYERS_LIST', // JSON array of player names
    'BACKEND_URL',
    'BACKEND_SECRET',
  ]

  private api: BackendApi | null = null
  private players: string[] = []
  private currentMap: string = ''

  init(config: Record<string, string>): void {
    super.init(config)

    try {
      this.players = JSON.parse(config.PLAYERS_LIST || '[]')
    } catch {
      throw new Error('Failed to parse PLAYERS_LIST')
    }

    this.api = new BackendApi(config.BACKEND_URL, config.BACKEND_SECRET)
  }

  async run(): Promise<void> {
    const { RACE_ID, SERVER_IP, SERVER_PORT } = this.config

    console.log(`[Race] Starting race monitor for game ${RACE_ID}`)
    console.log(`[Race] Monitoring players: ${this.players.join(', ')}`)

    const client = this.createClient('RaceBot')

    try {
      await client.connect(SERVER_IP, parseInt(SERVER_PORT))

      // Subscribe to chat messages
      client.onMessage(async (msg) => {
        await this.handleMessage(msg)
      })

      // Keep connection alive until stopped
      await this.waitForStop()

    } catch (error) {
      console.error('[Race] Error:', error)
      throw error
    }
  }

  private async handleMessage(msg: { author: string; text: string; team: boolean }) {
    // Check for finish messages from server
    // Format: "PlayerName finished in XX:XX.XX" or similar
    const finishRegex = /^(.+?) finished in (\d+):(\d+)\.(\d+)/i
    const match = msg.text.match(finishRegex)

    if (!match) return

    const [, playerName, minutes, seconds, ms] = match
    const finishTime = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 100

    // Check if player is in our race
    const normalizedName = playerName.trim().toLowerCase()
    const isRacePlayer = this.players.some(p => p.toLowerCase() === normalizedName)

    if (!isRacePlayer) {
      console.log(`[Race] Ignoring finish from non-participant: ${playerName}`)
      return
    }

    console.log(`[Race] Detected finish: ${playerName} in ${finishTime}s`)

    // Verify via DDNet API
    const verified = await this.verifyFinish(playerName)

    if (verified) {
      console.log(`[Race] Verified finish for ${playerName}`)
      await this.api!.reportRaceFinish(
        this.config.RACE_ID,
        playerName,
        finishTime
      )
    } else {
      console.log(`[Race] Could not verify finish for ${playerName}`)
    }
  }

  private async verifyFinish(playerName: string): Promise<boolean> {
    try {
      // Use DDNet API to check if player recently finished current map
      // This requires knowing the current map name
      const response = await fetch(
        `https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`
      )
      const data = await response.json()

      // Check recent activity
      // Implementation depends on DDNet API response structure
      return true // Placeholder - implement actual verification
    } catch (error) {
      console.error('[Race] Verification error:', error)
      return false
    }
  }

  private waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      // Will be resolved when cleanup is called
      process.on('SIGTERM', () => resolve())
      process.on('SIGINT', () => resolve())
    })
  }
}
```

### 3.2 Обновить BackendApi для Race

**Файл:** `apps/bot/src/api.ts` - добавить методы:

```typescript
export class BackendApi {
  // ... existing code ...

  async reportRaceFinish(
    raceId: string,
    playerName: string,
    finishTime: number
  ): Promise<void> {
    await this.post('/api/race/finish', {
      raceId,
      playerName,
      finishTime,
      timestamp: new Date().toISOString(),
    })
  }

  async reportMapChange(raceId: string, mapName: string): Promise<void> {
    await this.post('/api/race/map-change', {
      raceId,
      mapName,
    })
  }

  async getRaceStatus(raceId: string): Promise<any> {
    return this.get(`/api/race/${raceId}/status`)
  }
}
```

### 3.3 API Endpoints для Race

#### 3.3.1 Создать Race

**Файл:** `src/app/api/race/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: payloadConfig })

  // Check active games limit
  const activeGames = await payload.find({
    collection: 'races',
    where: {
      and: [
        { 'players.user': { equals: session.user.id } },
        { status: { in: ['waiting', 'ready', 'in_progress'] } },
      ],
    },
    limit: 1,
  })

  if (activeGames.docs.length > 0) {
    return NextResponse.json(
      { error: 'You already have an active race' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const {
    title,
    mode,
    category,
    totalRounds,
    server,
    isPublic,
  } = body

  // Get user's verified nickname
  const user = await payload.findByID({
    collection: 'users',
    id: session.user.id,
  })

  if (!user.isSystemVerified) {
    return NextResponse.json(
      { error: 'You must verify your nickname first' },
      { status: 400 }
    )
  }

  const race = await payload.create({
    collection: 'races',
    data: {
      title,
      mode,
      category,
      totalRounds,
      server,
      isPublic,
      currentRound: 0,
      players: [
        {
          user: session.user.id,
          ingameNick: user.name,
          roundsWon: 0,
          isReady: false,
        },
      ],
      rounds: [],
      status: 'waiting',
      createdBy: session.user.id,
      inviteCode: isPublic ? null : nanoid(8),
    },
  })

  return NextResponse.json({
    raceId: race.id,
    inviteCode: race.inviteCode,
  })
}
```

#### 3.3.2 Обработать финиш

**Файл:** `src/app/api/race/finish/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export async function POST(request: NextRequest) {
  // Verify bot secret
  const botSecret = request.headers.get('X-Bot-Secret')
  if (botSecret !== process.env.BACKEND_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId, playerName, finishTime, timestamp } = await request.json()

  const payload = await getPayload({ config: payloadConfig })

  const race = await payload.findByID({
    collection: 'races',
    id: raceId,
    depth: 2,
  })

  if (!race || race.status !== 'in_progress') {
    return NextResponse.json({ error: 'Invalid race' }, { status: 400 })
  }

  // Find player
  const playerIndex = race.players.findIndex(
    p => p.ingameNick.toLowerCase() === playerName.toLowerCase()
  )

  if (playerIndex === -1) {
    return NextResponse.json({ error: 'Player not in race' }, { status: 400 })
  }

  const player = race.players[playerIndex]

  // Check if round already has a winner
  const currentRound = race.rounds.find(r => r.roundNumber === race.currentRound)
  if (currentRound?.winner) {
    return NextResponse.json({ error: 'Round already completed' }, { status: 400 })
  }

  // Record round winner
  const rounds = [...race.rounds]
  const existingRoundIndex = rounds.findIndex(r => r.roundNumber === race.currentRound)

  if (existingRoundIndex >= 0) {
    rounds[existingRoundIndex] = {
      ...rounds[existingRoundIndex],
      winner: player.user,
      finishTime,
      completedAt: timestamp,
    }
  } else {
    rounds.push({
      roundNumber: race.currentRound,
      mapName: race.currentMap || 'Unknown',
      winner: player.user,
      finishTime,
      completedAt: timestamp,
    })
  }

  // Update player's rounds won
  const players = [...race.players]
  players[playerIndex] = {
    ...players[playerIndex],
    roundsWon: (players[playerIndex].roundsWon || 0) + 1,
  }

  // Check if race is complete
  const roundsWon = players[playerIndex].roundsWon
  const isComplete = roundsWon >= race.totalRounds

  const updateData: any = {
    rounds,
    players,
    currentRound: race.currentRound + 1,
  }

  if (isComplete) {
    updateData.status = 'completed'
    updateData.winner = player.user
    updateData.completedAt = new Date().toISOString()
  }

  await payload.update({
    collection: 'races',
    id: raceId,
    data: updateData,
  })

  return NextResponse.json({
    success: true,
    roundWinner: playerName,
    raceComplete: isComplete,
  })
}
```

#### 3.3.3 Запустить Race с ботом

**Файл:** `src/app/api/race/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { getBotManager } from '@/services/verification/BotManager'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { raceId } = await request.json()

  const payload = await getPayload({ config: payloadConfig })

  const race = await payload.findByID({
    collection: 'races',
    id: raceId,
    depth: 2,
  })

  if (!race) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 })
  }

  if (race.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Only creator can start' }, { status: 403 })
  }

  // Check all players ready
  const allReady = race.players.every(p => p.isReady)
  if (!allReady) {
    return NextResponse.json({ error: 'Not all players ready' }, { status: 400 })
  }

  // Check bot availability
  const botManager = getBotManager()
  if (!botManager.hasAvailableSlots()) {
    return NextResponse.json({ error: 'No bot slots available' }, { status: 503 })
  }

  // Start race bot
  const playerNames = race.players.map(p => p.ingameNick)

  try {
    const containerId = await botManager.startRaceBot(
      raceId,
      race.server.ip,
      race.server.port,
      playerNames
    )

    await payload.update({
      collection: 'races',
      id: raceId,
      data: {
        status: 'in_progress',
        currentRound: 1,
        startedAt: new Date().toISOString(),
        botId: containerId,
      },
    })

    // Create bot record
    await payload.create({
      collection: 'bots',
      data: {
        name: `RaceBot-${raceId.slice(0, 8)}`,
        containerId,
        mode: 'race',
        status: 'running',
        connectedServer: race.server,
        linkedGame: { relationTo: 'races', value: raceId },
        startedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start race bot' },
      { status: 500 }
    )
  }
}
```

### 3.4 Обновить BotManager для Race

**Файл:** `src/services/verification/BotManager.ts` - добавить метод:

```typescript
async startRaceBot(
  raceId: string,
  serverIp: string,
  serverPort: number,
  players: string[]
): Promise<string> {
  if (!this.hasAvailableSlots()) {
    throw new Error('No available bot slots')
  }

  const containerId = await this.driver.startContainer({
    image: 'bingo-bot:latest',
    env: {
      BOT_MODE: 'race',
      RACE_ID: raceId,
      SERVER_IP: serverIp,
      SERVER_PORT: serverPort.toString(),
      PLAYERS_LIST: JSON.stringify(players),
      BACKEND_URL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      BACKEND_SECRET: process.env.BACKEND_SECRET || '',
    },
  })

  this.activeVerifications.set(raceId, {
    containerId,
    startedAt: new Date(),
  })

  return containerId
}
```

## Race UI Components

### Race Page Layout

```
+----------------------------------+
|  Race: "Sunday Race"             |
|  Category: Brutal | Round 3/5    |
+----------------------------------+
|                                  |
|  +--------+  +--------+          |
|  | Player1|  | Player2|          |
|  | ★★☆☆   |  | ★★★☆   |          |
|  +--------+  +--------+          |
|                                  |
|  Current Map: Kobra 4            |
|  Server: ger1.ddnet.org:8303     |
|                                  |
+----------------------------------+
|  Round History:                  |
|  1. Skyline ☆ Player1 (02:34)   |
|  2. AIM 7.0 ☆ Player2 (01:45)   |
|  3. Kobra 4 - In Progress...     |
+----------------------------------+
```

## Checklist

- [ ] Создать `apps/bot/src/modes/race.ts`
- [ ] Обновить `apps/bot/src/api.ts`
- [ ] Зарегистрировать режим в `apps/bot/src/modes/index.ts`
- [ ] Создать API: POST `/api/race/create`
- [ ] Создать API: POST `/api/race/join`
- [ ] Создать API: POST `/api/race/start`
- [ ] Создать API: POST `/api/race/finish` (bot callback)
- [ ] Создать API: GET `/api/race/[id]`
- [ ] Обновить BotManager для Race
- [ ] Написать тесты для race logic
- [ ] Создать компоненты UI для Race страницы
