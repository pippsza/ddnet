# Game Modes: Bingo & Race

## Overview

The platform has two competitive game modes where players compete by finishing DDNet maps. Both modes share common infrastructure (game actions, user tracking, notifications) but differ in map selection and win conditions.

- **Bingo**: Grid-based — fill a row/column/diagonal/full grid of maps
- **Race**: Path-based — race through a linear sequence of maps

## Shared Infrastructure

### Game Actions API

All game actions share the pattern `POST /api/game/{gameId}/{action}`:

| Action | Route | Who | When | Effect |
|--------|-------|-----|------|--------|
| Join | `/api/game/{id}/join` | Any user | waiting/ready | Adds to team, sets activeGame |
| Leave | `/api/game/{id}/leave` | Player (not creator) | waiting/ready | Removes from team |
| Ready | `/api/game/{id}/ready` | Player | waiting | Toggles isReady |
| Start | `/api/game/{id}/start` | Creator | ready | Sets in_progress, startedAt |
| Surrender | `/api/game/{id}/surrender` | Player | in_progress | Solo: cancel. Team: other team wins |
| Cancel | `/api/game/{id}/cancel` | Creator | not completed | Marks cancelled |
| Settings | `PATCH /api/game/{id}/settings` | Creator | waiting/ready | Updates configuration |
| Rematch | `/api/game/{id}/rematch` | Player | completed | Creates new game same settings |

**Join by invite code**: `POST /api/game/join/{inviteCode}` — for private games.

### User Game Tracking

In `Users` collection:

- `activeGame` — polymorphic relationship to `bingo` OR `races` (current game, max 1)
- `completedGames` — array of polymorphic relationships (game history)

When a game starts, `activeGame` is set. When it ends, it's cleared and added to `completedGames`.

### Team Structure (shared by both modes)

```typescript
teams: [{
  teamName: string          // "Team 1"
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'
  players: [{
    user: Relationship<Users>
    isReady: boolean
  }]                        // max 2 players per team
  pendingInvites: [{
    user: Relationship<Users>
    invitedAt: Date
  }]
  teamStatus: 'not_ready' | 'ready' | 'playing' | 'winner' | 'loser'
}]
```

- **Solo mode**: 1 team (1-2 players)
- **Team mode**: 2 teams (1-2 players each)

### Notification System

Game invites trigger notifications with action URLs:

- Bingo: `/app/bingo/{id}?team={teamIndex}`
- Race: `/app/race/{id}?team={teamIndex}`

---

## Bingo Mode

### Collection Schema (`src/collections/bingo.ts`)

```
title          — Game name
mode           — 'solo' | 'team'
category       — DDNet category string (e.g., 'novice', 'brutal')
gridSize       — '3x3' | '5x5' | '7x7'
winCondition   — 'line' | 'cross' | 'full_house'
isPublic       — Visibility in lobby
difficultyRange — { min: 0-5, max: 0-5 } (star rating filter)
maps[]         — [{ mapName, position (0-48), points, difficulty }]
teams[]        — Team structure with completedCells[]
  completedCells[] — [{ cellPosition, completedAt }]
gameStatus     — 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'
winnerTeam     — Index of winning team (0 or 1)
inviteCode     — 8-char code for private games
createdBy      — User reference
createdVia     — 'web' | 'client'
startedAt / completedAt / duration
```

### Creation Flow

**Handler**: `src/services/game-actions/create/bingo.ts` → `handleCreateBingo()`

1. Validate fields (mode, category, gridSize, winCondition, difficulty range)
2. Check user doesn't have an active game
3. Generate grid via `generateBingoGrid()`:
   - Fetch maps from `https://ddnet.org/releases/maps.json` (cached 1 hour)
   - Filter by category and difficulty range
   - Require minimum maps (9 for 3x3, 25 for 5x5, 49 for 7x7)
   - Fisher-Yates shuffle → select first N maps
4. Create game document with `gameStatus: 'waiting'`
5. Set user's `activeGame`

**Grid Generator**: `src/services/bingo/gridGenerator.ts` → `generateBingoGrid()`

### Game Lifecycle

```
CREATE → generate grid from DDNet maps
  ↓
LOBBY (waiting/ready)
  → Players join/leave, creator edits settings
  → All players ready → creator starts
  ↓
IN-PROGRESS
  → Players finish maps on DDNet servers
  → gameProgressJob polls every 5s
  → Cells marked when ALL team members finish map
  → Win condition checked after each cell
  ↓
COMPLETED / SURRENDERED
  → Stats updated, activeGame cleared
  → Rematch available
```

### Progress Detection

**Job**: `src/jobs/gameProgressJob.ts` → `checkBingoProgress(gameId)`

Every 5 seconds:

1. Fetch each player's finishes: `https://ddnet.org/players/?json2={playerName}`
2. Filter: only finishes with `timestamp > game.startedAt`
3. Match finished map names against grid's `maps[]` (case-insensitive)
4. Mark cell complete when **ALL players on the team** finish that map
5. `completedAt` = timestamp of the **last** player to finish
6. After each update, run win detection

### Win Detection

**Checker**: `src/services/bingo/winChecker.ts` → `checkWinner(gridSize, winCondition, teams)`

Returns `{ hasWinner, winningTeamIndex, winningCells[], condition }`.

**Win conditions on a 3x3 grid:**

```
LINE: any row, column, or diagonal
  Rows:      [0,1,2] [3,4,5] [6,7,8]
  Columns:   [0,3,6] [1,4,7] [2,5,8]
  Diagonals: [0,4,8] [2,4,6]

CROSS: either pattern
  + Pattern: any full row + any full column
  X Pattern: both diagonals [0,4,8] AND [2,4,6]

FULL_HOUSE: all cells (9 for 3x3, 25 for 5x5, 49 for 7x7)
```

### Player Stats

Updated via `updateBingoPlayerStats()` at game completion.

Per-category (in `Users.bingo.{category}.{mode}`):
- `gamesPlayed`, `gamesWon`, `gamesLost`
- `totalMapsCompleted`, `averageGameDuration`, `fastestWin`

Global (`Users.bingo`):
- `totalGamesPlayed`, `totalGamesWon`, `winRate`, `favoriteCategory`

### Frontend Pages

| Page | Path | Purpose |
|------|------|---------|
| Lobby | `/app/bingo` | Public games list, my active/past games, join by code |
| Create | `/app/bingo/create` | Auto-creates with defaults, redirects to game |
| Game | `/app/bingo/[id]` | LobbyView (waiting) or GameView (in_progress) |

**Game UI components:**
- `BingoGrid` — interactive grid with colored overlays per team
- `GamePlayerBar` — team display with avatars and scores
- `GameStartCountdown` — 10-second countdown before grid reveal
- Real-time updates: SWR polling every 3 seconds

### Key Files

```
src/collections/bingo.ts                          — Collection schema
src/services/game-actions/create/bingo.ts          — handleCreateBingo()
src/services/bingo/gridGenerator.ts                — generateBingoGrid()
src/services/bingo/winChecker.ts                   — checkWinner()
src/jobs/gameProgressJob.ts                        — checkBingoProgress()
src/app/(frontend)/app/bingo/page.tsx              — Lobby
src/app/(frontend)/app/bingo/create/page.tsx       — Auto-create
src/app/(frontend)/app/bingo/[id]/page.tsx         — Game detail
src/components/bingo/BingoGrid.tsx                 — Grid component
src/components/bingo/GamePlayerBar.tsx              — Player bar
```

---

## Race Mode

### Collection Schema (`src/collections/Races.ts`)

```
title          — Race name
mode           — 'solo' | 'team'
categoryMode   — 'selected' (pre-generated path) | 'free' (dynamic maps)
category       — DDNet category string
pathLength     — 3-20 (number of steps)
isPublic       — Visibility in lobby
difficultyRange — { min: 0-5, max: 0-5 }
maps[]         — [{ mapName, position (0-N), points, difficulty }]
server         — { ip, port, name } (target game server)
currentStep    — Current step being played (0-based)
currentMap     — Map name on current step
teams[]        — Team structure with score + completedSteps[]
  score             — Number of steps completed
  completedSteps[]  — [{ position, completedAt, finishTime }]
gameStatus     — 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'
winnerTeam     — Index of winning team
surrenderedByTeam — Index of surrendering team
botContainerId — Docker container ID of monitoring bot
inviteCode / createdBy / createdVia / startedAt / completedAt / duration
```

### Category Modes

- **Selected**: Maps are generated at game start. All players race the same sequence.
- **Free**: No pre-selected maps. First to finish ANY map in category (not previously used) advances.

### Creation Flow

**Handler**: `src/services/game-actions/create/race.ts` → `handleCreateRace()`

1. Validate user is `isSystemVerified`
2. Check no active game
3. Validate path options (if selected mode): enough maps in category
4. Create race with empty maps (filled at start)
5. Set `activeGame`

**Path Generator**: `src/services/race/pathGenerator.ts` → `generateRacePath()`

- Same map source as bingo: `https://ddnet.org/releases/maps.json`
- Filter by category + difficulty → shuffle → select `pathLength` maps

### Start Flow (Web)

**Handler**: `src/services/game-actions/start-race-web.ts` → `handleStartRaceWeb()`

1. Generate race path (for selected mode)
2. Check if race bot is enabled in BotSettings
3. If enabled: start Docker bot via `BotManager.startRaceBot()`
4. Set `gameStatus: 'in_progress'`, record `startedAt`

### Progress Detection

**Job**: `src/jobs/gameProgressJob.ts` → `checkRaceProgress(gameId)`

Every 5 seconds:

1. **Server presence check**: query Master Server to verify players are on the game server (60-second window)
2. **Fetch finishes**: DDNet API `?json2={playerName}` for each player
3. **Score current step**:
   - Selected mode: finish must match `currentMap` exactly
   - Free mode: finish must not be in previously-used maps set
4. Find earliest valid finish → award point to that team
5. Advance `currentStep`
6. **Completion**: when `currentStep >= pathLength`
   - Winner = most steps completed
   - Tie-break: lowest total `finishTime` across all steps

### Race Bot (Announcer Only)

**File**: `apps/bot/src/modes/race.ts` → `RaceMode`

The bot is a **cosmetic announcer** — it does NOT determine scores. The `gameProgressJob` is the single source of truth.

Bot behavior:
- Connects to game server via Teeworlds protocol
- Parses server finish messages: `"player finished in: X minute(s) Y second(s)"`
- Announces: `"{player} scored! Finished \"{map}\" in {time} | Next: {nextMap} (step N/M)"`
- Polls backend every 5s for game status (surrender, cancel, completion)
- Auto-reconnect up to 10 times with 3s delays

**Bot config** (passed as env vars to Docker container):
```
RACE_ID, SERVER_IP, SERVER_PORT, PLAYERS_LIST (JSON),
MAPS_LIST (JSON), BACKEND_URL, BACKEND_SECRET, LOG_FILE
```

### Player Stats

Updated via `updateRacePlayerStats()` at game completion.

Per-category (in `Users.raceStats.{category}`):
- `gamesPlayed`, `gamesWon`, `gamesLost`
- `totalRoundsWon`, `bestFinishTime`, `averageFinishTime`

Global (`Users.raceStats`):
- `totalRacesPlayed`, `totalRacesWon`, `winRate`, `favoriteCategory`

### Frontend Pages

| Page | Path | Purpose |
|------|------|---------|
| Lobby | `/app/race` | Public races, my active/past races, join by code |
| Create | `/app/race/create` | Auto-creates with defaults, redirects |
| Game | `/app/race/[id]` | LobbyView (settings, teams) or GameView (race path) |

### Key Files

```
src/collections/Races.ts                          — Collection schema
src/services/game-actions/create/race.ts           — handleCreateRace()
src/services/game-actions/start-race-web.ts        — handleStartRaceWeb()
src/services/game-actions/settings/race.ts         — handleRaceSettings()
src/services/race/pathGenerator.ts                 — generateRacePath()
src/jobs/gameProgressJob.ts                        — checkRaceProgress()
apps/bot/src/modes/race.ts                         — RaceMode (announcer)
src/services/verification/BotManager.ts            — startRaceBot()
src/app/(frontend)/app/race/page.tsx               — Lobby
src/app/(frontend)/app/race/create/page.tsx        — Auto-create
src/app/(frontend)/app/race/[id]/page.tsx          — Game detail
```

---

## Client Integration

### Client Token System

Users can generate a `clientToken` (32-byte random hex) for authenticating from DDNet client mods without web login.

- **Generate**: `POST /api/client/token` (requires web session)
- **Check**: `GET /api/client/token` (returns boolean)
- **Revoke**: `DELETE /api/client/token`
- **Use**: `Authorization: Bearer {clientToken}` header

Client-created races have `createdVia: 'client'` and use simplified start flow (no bot, settings locked to source).

### Finish Detection Pipeline

```
gameProgressJob (every 5 seconds)
  → For each in_progress game:
    → Collect player names from teams
    → Fetch DDNet API: GET https://ddnet.org/players/?json2={name}
    → Parse last_finishes: [{ timestamp, map, time, country }]
    → Filter: timestamp > game.startedAt
    → Match against game maps (bingo grid or race path)
    → Update game state (completedCells or completedSteps)
    → Check win condition
```

**Important**: Scoring is done entirely by the backend job polling DDNet's public API. Bots are cosmetic announcers only — they never report scores to the backend.

### Bot System

**Docker-based**: `BotManager` (singleton) manages bot containers via `dockerode`.

- Image: `bingo-bot:latest` (rebuild: `docker build -t bingo-bot:latest ./apps/bot`)
- NetworkMode: `host` (required for local server access)
- Memory: 256 MiB limit, 128 MiB reservation
- CPU: 256 shares, PID limit: 50
- Auto-cleanup: containers older than 30 minutes

Bot modes available:
- `verification` — nickname verification via DDNet `/verify` command
- `race` — race announcer
- `test` — connection testing
- `ingame-chat` — in-game messaging

### Server Presence Verification (Race only)

Before scoring a race finish, the job checks if the player is actually on the game server:

1. Query DDNet Master Server (`master1.ddnet.org/ddnet/15/servers.json`)
2. Find player by name on the specified server IP:port
3. Only count finishes from players seen on server within last 60 seconds

This prevents scoring map finishes from other servers.

---

## DDNet Categories Reference

Both Bingo and Race use DDNet map categories:

| Category | Typical Difficulty |
|----------|-------------------|
| Novice | 1-2 stars |
| Moderate | 2-3 stars |
| Brutal | 3-4 stars |
| Insane | 4-5 stars |
| Dummy | 2-3 stars |
| DDmaX.Easy | 2-3 stars |
| DDmaX.Next | 3-4 stars |
| DDmaX.Pro | 4-5 stars |
| DDmaX.Nut | 4-5 stars |
| Oldschool | 2-4 stars |
| Solo | 2-4 stars |
| Race | 1-3 stars |

Maps fetched from: `https://ddnet.org/releases/maps.json` (cached 1 hour).

Custom categories supported via `custom_{slug}` naming convention.
