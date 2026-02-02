# Stage 2: Bingo Core

## Overview
Основной функционал режима Bingo: создание игр, генерация сетки, отслеживание прогресса, определение победителя.

## Game Rules

### Режимы
- **Solo**: 1 команда (1-2 игрока), играют за очки
- **Team**: 2 команды (1-2 игрока каждая), соревнуются за победу

### Условия победы
- **Line**: Горизонтальная, вертикальная или диагональная линия
- **Cross**: Крест в центре сетки
- **Full House**: Все ячейки закрыты

### Ключевые правила
1. **Авто-зачёт**: Игрок играет любые карты из категории. Если карта есть в сетке - ячейка закрывается автоматически
2. **Только во время игры**: Засчитываются только финиши ПОСЛЕ старта bingo (timestamp >= startedAt)
3. **Обе команды могут закрыть одну ячейку**: Визуально ячейка делится пополам разными цветами
4. **Победа по условию**: Первая команда, выполнившая условие победы (line/cross/full_house)
5. **Лимит**: 1 активная игра на пользователя

## Tasks

### 2.1 Обновить коллекцию Bingo

**Файл:** `src/collections/bingo.ts` - добавить поля:

```typescript
// Добавить в fields:
{
  name: 'isPublic',
  type: 'checkbox',
  defaultValue: false,
  label: 'Public Game (visible in lobby)',
},
{
  name: 'difficultyRange',
  type: 'group',
  label: 'Map Difficulty Range (stars)',
  fields: [
    {
      name: 'min',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
    },
    {
      name: 'max',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 5,
    },
  ],
},
{
  name: 'createdBy',
  type: 'relationship',
  relationTo: 'users',
  required: true,
},
{
  name: 'inviteCode',
  type: 'text',
  unique: true,
  label: 'Invite Code for private games',
},
```

### 2.2 Создать функцию генерации сетки

**Файл:** `src/services/bingo/gridGenerator.ts`

```typescript
import { Map } from 'ddnet'

interface MapInfo {
  name: string
  difficulty: number
  points: number
}

interface GridGeneratorOptions {
  category: string
  subcategory?: string
  gridSize: '3x3' | '5x5' | '7x7'
  difficultyMin: number
  difficultyMax: number
}

/**
 * Generate random maps for bingo grid
 */
export async function generateBingoGrid(options: GridGeneratorOptions): Promise<MapInfo[]> {
  const { category, subcategory, gridSize, difficultyMin, difficultyMax } = options

  const gridSizes = {
    '3x3': 9,
    '5x5': 25,
    '7x7': 49,
  }

  const count = gridSizes[gridSize]

  // Fetch maps from DDNet API for category
  const allMaps = await fetchMapsByCategory(category, subcategory)

  // Filter by difficulty range
  const filteredMaps = allMaps.filter(
    map => map.difficulty >= difficultyMin && map.difficulty <= difficultyMax
  )

  if (filteredMaps.length < count) {
    throw new Error(`Not enough maps in category ${category} with difficulty ${difficultyMin}-${difficultyMax}. Need ${count}, got ${filteredMaps.length}`)
  }

  // Shuffle and pick random maps
  const shuffled = shuffleArray([...filteredMaps])
  const selectedMaps = shuffled.slice(0, count)

  return selectedMaps.map((map, index) => ({
    mapName: map.name,
    position: index,
    difficulty: map.difficulty,
    points: map.points,
  }))
}

async function fetchMapsByCategory(category: string, subcategory?: string): Promise<MapInfo[]> {
  // TODO: Implement using ddnet.js
  // Maps can be fetched from: https://ddnet.org/releases/
  // or parsed from the ddnet.js library

  // Placeholder implementation:
  const response = await fetch(`https://ddnet.org/releases/?type=${category}`)
  // Parse and return maps

  return []
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
```

### 2.3 Создать функцию определения победителя

**Файл:** `src/services/bingo/winChecker.ts`

```typescript
type WinCondition = 'line' | 'cross' | 'full_house'
type GridSize = '3x3' | '5x5' | '7x7'

interface WinCheckResult {
  hasWinner: boolean
  winningTeamIndex?: number
  winningCells?: number[]
  condition?: WinCondition
}

interface TeamCells {
  teamIndex: number
  completedCells: number[]
}

/**
 * Universal win checker for bingo
 * @param gridSize - Size of the grid (3x3, 5x5, 7x7)
 * @param winCondition - Type of win condition
 * @param teams - Array of team completed cells
 * @returns Win check result
 */
export function checkWinner(
  gridSize: GridSize,
  winCondition: WinCondition,
  teams: TeamCells[]
): WinCheckResult {
  const size = parseInt(gridSize.split('x')[0])

  for (const team of teams) {
    const cells = new Set(team.completedCells)

    switch (winCondition) {
      case 'line':
        const lineResult = checkLine(size, cells)
        if (lineResult.won) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: lineResult.cells,
            condition: 'line',
          }
        }
        break

      case 'cross':
        const crossResult = checkCross(size, cells)
        if (crossResult.won) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: crossResult.cells,
            condition: 'cross',
          }
        }
        break

      case 'full_house':
        const totalCells = size * size
        if (cells.size === totalCells) {
          return {
            hasWinner: true,
            winningTeamIndex: team.teamIndex,
            winningCells: Array.from(cells),
            condition: 'full_house',
          }
        }
        break
    }
  }

  return { hasWinner: false }
}

function checkLine(size: number, cells: Set<number>): { won: boolean; cells?: number[] } {
  // Check horizontal lines
  for (let row = 0; row < size; row++) {
    const rowCells: number[] = []
    let complete = true
    for (let col = 0; col < size; col++) {
      const pos = row * size + col
      rowCells.push(pos)
      if (!cells.has(pos)) {
        complete = false
        break
      }
    }
    if (complete) return { won: true, cells: rowCells }
  }

  // Check vertical lines
  for (let col = 0; col < size; col++) {
    const colCells: number[] = []
    let complete = true
    for (let row = 0; row < size; row++) {
      const pos = row * size + col
      colCells.push(pos)
      if (!cells.has(pos)) {
        complete = false
        break
      }
    }
    if (complete) return { won: true, cells: colCells }
  }

  // Check diagonal (top-left to bottom-right)
  const diag1: number[] = []
  let diag1Complete = true
  for (let i = 0; i < size; i++) {
    const pos = i * size + i
    diag1.push(pos)
    if (!cells.has(pos)) {
      diag1Complete = false
      break
    }
  }
  if (diag1Complete) return { won: true, cells: diag1 }

  // Check diagonal (top-right to bottom-left)
  const diag2: number[] = []
  let diag2Complete = true
  for (let i = 0; i < size; i++) {
    const pos = i * size + (size - 1 - i)
    diag2.push(pos)
    if (!cells.has(pos)) {
      diag2Complete = false
      break
    }
  }
  if (diag2Complete) return { won: true, cells: diag2 }

  return { won: false }
}

function checkCross(size: number, cells: Set<number>): { won: boolean; cells?: number[] } {
  const center = Math.floor(size / 2)
  const crossCells: number[] = []

  // Middle row
  for (let col = 0; col < size; col++) {
    crossCells.push(center * size + col)
  }

  // Middle column (excluding center which is already added)
  for (let row = 0; row < size; row++) {
    if (row !== center) {
      crossCells.push(row * size + center)
    }
  }

  const allHave = crossCells.every(pos => cells.has(pos))
  return { won: allHave, cells: allHave ? crossCells : undefined }
}

// Helper to visualize grid for debugging
export function visualizeGrid(size: number, team1Cells: number[], team2Cells: number[] = []): string {
  const team1Set = new Set(team1Cells)
  const team2Set = new Set(team2Cells)

  let grid = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = row * size + col
      if (team1Set.has(pos) && team2Set.has(pos)) {
        grid += '[X] ' // Both teams
      } else if (team1Set.has(pos)) {
        grid += '[1] '
      } else if (team2Set.has(pos)) {
        grid += '[2] '
      } else {
        grid += '[ ] '
      }
    }
    grid += '\n'
  }
  return grid
}
```

### 2.4 Создать Payload Job для отслеживания прогресса

**Файл:** `src/jobs/bingoProgressJob.ts`

```typescript
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { Player } from 'ddnet'
import { checkWinner } from '@/services/bingo/winChecker'

const POLL_INTERVAL = parseInt(process.env.BINGO_POLL_INTERVAL_MS || '5000')

interface BingoGame {
  id: string
  maps: { mapName: string; position: number }[]
  teams: {
    players: { user: { id: string; name: string } }[]
    completedCells: { cellPosition: number; completedAt: string }[]
  }[]
  startedAt: string
  gridSize: string
  winCondition: string
  gameStatus: string
}

/**
 * Job to check map finishes and update bingo progress
 * This should be run as a Payload scheduled job
 */
export async function checkBingoProgress(gameId: string) {
  const payload = await getPayload({ config: payloadConfig })

  // Get game data
  const game = await payload.findByID({
    collection: 'bingo',
    id: gameId,
    depth: 2,
  }) as unknown as BingoGame

  if (!game || game.gameStatus !== 'in_progress') {
    return { continue: false }
  }

  const startTime = new Date(game.startedAt)
  const mapNames = game.maps.map(m => m.mapName)

  // Create map position lookup
  const mapPositions = new Map<string, number>()
  game.maps.forEach(m => mapPositions.set(m.mapName.toLowerCase(), m.position))

  let updated = false

  // Check each team
  for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
    const team = game.teams[teamIndex]
    const completedPositions = new Set(team.completedCells.map(c => c.cellPosition))

    // Check each player in team
    for (const player of team.players) {
      const playerName = player.user.name

      try {
        // Fetch player data from DDNet
        const ddnetPlayer = await Player.new(playerName)

        // Check recent finishes
        for (const finish of ddnetPlayer.finishes || []) {
          const finishTime = new Date(finish.timestamp)

          // Skip if finished before game started
          if (finishTime < startTime) continue

          // Check if this map is in our grid
          const position = mapPositions.get(finish.mapName.toLowerCase())
          if (position !== undefined && !completedPositions.has(position)) {
            // New completion!
            team.completedCells.push({
              cellPosition: position,
              completedAt: finish.timestamp,
            })
            completedPositions.add(position)
            updated = true

            console.log(`[BingoJob] ${playerName} completed ${finish.mapName} at position ${position}`)
          }
        }
      } catch (error) {
        console.error(`[BingoJob] Error fetching player ${playerName}:`, error)
      }
    }
  }

  // Check for winner
  const teams = game.teams.map((team, index) => ({
    teamIndex: index,
    completedCells: team.completedCells.map(c => c.cellPosition),
  }))

  const winResult = checkWinner(
    game.gridSize as '3x3' | '5x5' | '7x7',
    game.winCondition as 'line' | 'cross' | 'full_house',
    teams
  )

  // Update game if there are changes
  if (updated || winResult.hasWinner) {
    const updateData: any = {
      teams: game.teams,
    }

    if (winResult.hasWinner) {
      updateData.gameStatus = 'completed'
      updateData.winnerTeam = winResult.winningTeamIndex
      updateData.completedAt = new Date().toISOString()

      // Calculate duration
      const duration = Math.floor(
        (new Date().getTime() - startTime.getTime()) / 60000
      )
      updateData.duration = duration

      // Update team statuses
      updateData.teams = game.teams.map((team, index) => ({
        ...team,
        teamStatus: index === winResult.winningTeamIndex ? 'winner' : 'loser',
      }))
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: updateData,
    })
  }

  return {
    continue: !winResult.hasWinner,
    updated,
    winner: winResult.hasWinner ? winResult.winningTeamIndex : null,
  }
}

/**
 * Start polling for a bingo game
 */
export function startBingoPolling(gameId: string) {
  const interval = setInterval(async () => {
    try {
      const result = await checkBingoProgress(gameId)
      if (!result.continue) {
        clearInterval(interval)
        console.log(`[BingoJob] Stopped polling for game ${gameId}`)
      }
    } catch (error) {
      console.error(`[BingoJob] Error polling game ${gameId}:`, error)
    }
  }, POLL_INTERVAL)

  return interval
}
```

### 2.5 API Endpoints

#### 2.5.1 Создать игру

**Файл:** `src/app/api/bingo/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { generateBingoGrid } from '@/services/bingo/gridGenerator'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: payloadConfig })

  // Check if user already has active game
  const activeGames = await payload.find({
    collection: 'bingo',
    where: {
      and: [
        { 'teams.players.user': { equals: session.user.id } },
        { gameStatus: { in: ['waiting', 'ready', 'in_progress'] } },
      ],
    },
    limit: 1,
  })

  if (activeGames.docs.length > 0) {
    return NextResponse.json(
      { error: 'You already have an active bingo game' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const {
    title,
    mode,
    category,
    subcategory,
    gridSize,
    winCondition,
    isPublic,
    difficultyMin,
    difficultyMax,
  } = body

  // Generate grid
  const maps = await generateBingoGrid({
    category,
    subcategory,
    gridSize,
    difficultyMin: difficultyMin || 0,
    difficultyMax: difficultyMax || 5,
  })

  // Create game
  const game = await payload.create({
    collection: 'bingo',
    data: {
      title,
      mode,
      category,
      subcategory,
      gridSize,
      winCondition,
      isPublic,
      difficultyRange: {
        min: difficultyMin || 0,
        max: difficultyMax || 5,
      },
      maps,
      teams: [
        {
          teamName: 'Team 1',
          color: 'red',
          players: [{ user: session.user.id, isReady: false }],
          completedCells: [],
          teamStatus: 'not_ready',
        },
      ],
      gameStatus: 'waiting',
      createdBy: session.user.id,
      inviteCode: isPublic ? null : nanoid(8),
    },
  })

  return NextResponse.json({
    gameId: game.id,
    inviteCode: game.inviteCode,
  })
}
```

#### 2.5.2 Присоединиться к игре

**Файл:** `src/app/api/bingo/join/route.ts`

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

  const { gameId, inviteCode, teamIndex } = await request.json()

  const payload = await getPayload({ config: payloadConfig })

  // Get game
  const game = await payload.findByID({
    collection: 'bingo',
    id: gameId,
  })

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Check invite code for private games
  if (!game.isPublic && game.inviteCode !== inviteCode) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
  }

  if (game.gameStatus !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  }

  // Check if user already in game
  const alreadyJoined = game.teams.some(team =>
    team.players.some(p => p.user === session.user.id)
  )
  if (alreadyJoined) {
    return NextResponse.json({ error: 'Already in this game' }, { status: 400 })
  }

  // Add player to team
  const teams = [...game.teams]

  if (game.mode === 'team' && teamIndex !== undefined) {
    // Team mode - add to specified team
    if (teamIndex >= teams.length) {
      // Create new team if needed
      teams.push({
        teamName: `Team ${teamIndex + 1}`,
        color: ['red', 'blue', 'green', 'yellow'][teamIndex] || 'purple',
        players: [{ user: session.user.id, isReady: false }],
        completedCells: [],
        teamStatus: 'not_ready',
      })
    } else {
      if (teams[teamIndex].players.length >= 2) {
        return NextResponse.json({ error: 'Team is full' }, { status: 400 })
      }
      teams[teamIndex].players.push({ user: session.user.id, isReady: false })
    }
  } else {
    // Solo mode - add to first team
    if (teams[0].players.length >= 2) {
      return NextResponse.json({ error: 'Team is full' }, { status: 400 })
    }
    teams[0].players.push({ user: session.user.id, isReady: false })
  }

  await payload.update({
    collection: 'bingo',
    id: gameId,
    data: { teams },
  })

  return NextResponse.json({ success: true })
}
```

#### 2.5.3 Запустить игру

**Файл:** `src/app/api/bingo/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { auth } from '@/lib/auth'
import { startBingoPolling } from '@/jobs/bingoProgressJob'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { gameId } = await request.json()

  const payload = await getPayload({ config: payloadConfig })

  const game = await payload.findByID({
    collection: 'bingo',
    id: gameId,
  })

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Only creator can start
  if (game.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Only creator can start the game' }, { status: 403 })
  }

  // Check all players ready
  const allReady = game.teams.every(team =>
    team.players.every(p => p.isReady)
  )

  if (!allReady) {
    return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 })
  }

  // Validate team composition
  if (game.mode === 'team' && game.teams.length !== 2) {
    return NextResponse.json({ error: 'Team mode requires exactly 2 teams' }, { status: 400 })
  }

  // Start game
  const teams = game.teams.map(team => ({
    ...team,
    teamStatus: 'playing',
  }))

  await payload.update({
    collection: 'bingo',
    id: gameId,
    data: {
      gameStatus: 'in_progress',
      startedAt: new Date().toISOString(),
      teams,
    },
  })

  // Start polling job
  startBingoPolling(gameId)

  return NextResponse.json({ success: true, startedAt: new Date().toISOString() })
}
```

## Checklist

- [ ] Обновить коллекцию Bingo (isPublic, difficultyRange, createdBy, inviteCode)
- [ ] Создать `src/services/bingo/gridGenerator.ts`
- [ ] Создать `src/services/bingo/winChecker.ts`
- [ ] Создать `src/jobs/bingoProgressJob.ts`
- [ ] Создать API endpoint: POST `/api/bingo/create`
- [ ] Создать API endpoint: POST `/api/bingo/join`
- [ ] Создать API endpoint: POST `/api/bingo/start`
- [ ] Создать API endpoint: POST `/api/bingo/ready` (toggle ready status)
- [ ] Создать API endpoint: GET `/api/bingo/[id]` (get game state)
- [ ] Написать тесты для winChecker
- [ ] Написать тесты для gridGenerator

## Testing

### Win Checker Tests

```typescript
import { checkWinner, visualizeGrid } from '@/services/bingo/winChecker'

describe('checkWinner', () => {
  it('should detect horizontal line win', () => {
    const result = checkWinner('3x3', 'line', [
      { teamIndex: 0, completedCells: [0, 1, 2] }, // Top row
    ])
    expect(result.hasWinner).toBe(true)
    expect(result.winningTeamIndex).toBe(0)
  })

  it('should detect diagonal win', () => {
    const result = checkWinner('3x3', 'line', [
      { teamIndex: 0, completedCells: [0, 4, 8] }, // Main diagonal
    ])
    expect(result.hasWinner).toBe(true)
  })

  it('should detect cross win for 5x5', () => {
    // Cross for 5x5: middle row (10,11,12,13,14) + middle column (2,7,17,22)
    const crossCells = [2, 7, 10, 11, 12, 13, 14, 17, 22]
    const result = checkWinner('5x5', 'cross', [
      { teamIndex: 0, completedCells: crossCells },
    ])
    expect(result.hasWinner).toBe(true)
  })

  it('should not have winner if condition not met', () => {
    const result = checkWinner('3x3', 'line', [
      { teamIndex: 0, completedCells: [0, 1, 3] }, // Not a line
    ])
    expect(result.hasWinner).toBe(false)
  })
})
```
