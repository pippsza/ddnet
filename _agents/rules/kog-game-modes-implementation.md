# KoG Bingo & KoG Race — Implementation Status

## Overview

Two new game modes — **KoG Bingo** and **KoG Race** — use KoG (kog.tw) maps and ranking system instead of DDNet. Separate collections, pages, and progress tracking, reusing shared game action infrastructure.

## Key Differences: KoG vs DDNet

| Aspect | DDNet (current) | KoG (new) |
|--------|----------------|-----------|
| **Map source** | `ddnet.org/releases/maps.json` (JSON API) | Parse `kog.tw/get.php?p=maps` (~2MB HTML, Cheerio, cached 1h) |
| **Categories** | 13: Novice, Moderate, Brutal, etc. | 7: Easy, Main, Hard, Insane, Extreme, Solo, Mod |
| **Difficulty** | Star rating 0-5 per map | Star rating 1-5 per map (parsed from HTML) |
| **Points** | Calculated from stars × category multiplier | Stored per map (parsed from HTML) |
| **Finish detection** | `ddnet.org/players/?json2=NAME` → JSON with timestamps | Snapshot diff: compare finishedMaps before/after game start |
| **Response format** | JSON (~5KB) | HTML (~300KB per player, needs Cheerio + PHP session) |
| **Polling cost** | ~100ms per player | ~500ms per player (session + HTML parse) |

## Implemented Backend (Phase 1-3) ✅

### Collections

| Collection | Slug | File |
|-----------|------|------|
| KoG Bingo | `kog-bingo` | `src/collections/KogBingo.ts` |
| KoG Races | `kog-races` | `src/collections/KogRaces.ts` |

Both mirror their DDNet counterparts with:
- KoG category validation (accepts `kog_easy`, `kog_main`, etc.)
- Star-based difficulty range (1-5, same as DDNet)
- Points per map (from KoG maps page)
- Same team structure, game statuses, win conditions

### Constants & Types

| File | Purpose |
|------|---------|
| `src/lib/kog-constants.ts` | `KOG_CATEGORIES`, `KoGCategory` type, `isKoGCategory()`, label mappings |
| `src/lib/kog-types.ts` | `KoGPlayerData`, `KoGFinishedMap`, `KoGSkin`, etc. |
| `src/lib/category-helpers.ts` | Updated: `validateCategory()` now accepts KoG categories |

### KoG Category Values

Internal values use `kog_` prefix to avoid collision with DDNet categories:

| Label | Value | KoG HTML label |
|-------|-------|---------------|
| Easy | `kog_easy` | Easy |
| Main | `kog_main` | Main |
| Hard | `kog_hard` | Hard |
| Insane | `kog_insane` | Insane |
| Extreme | `kog_extreme` | Extreme |
| Solo | `kog_solo` | Unknown (KoG maps page quirk) |
| Mod | `kog_mod` | Mod |

### Services

| File | Purpose |
|------|---------|
| `src/services/kog/mapProvider.ts` | Fetches all 1062 KoG maps from `get.php?p=maps`, parses with Cheerio, caches 1h. `getKoGMapsByCategory()` |
| `src/services/kog/gridGenerator.ts` | `generateKoGBingoGrid()` — random map selection for bingo grid |
| `src/services/kog/pathGenerator.ts` | `generateKoGRacePath()` — random map selection for race path |
| `src/services/kog/finishDetector.ts` | Snapshot-based finish detection: `takeFinishSnapshot()`, `detectNewFinishes()`, `updateSnapshot()` |

### Game Actions

| File | Purpose |
|------|---------|
| `src/services/game-actions/create/kog-bingo.ts` | `handleCreateKoGBingo()` — creates KoG bingo game |
| `src/services/game-actions/create/kog-race.ts` | `handleCreateKoGRace()` — creates KoG race game |
| `src/app/api/game/create/route.ts` | Updated: accepts `type: 'kog-bingo' | 'kog-race'` |

### Game Progress Job

`src/jobs/gameProgressJob.ts` extended with:

- `checkKoGBingoProgress(gameId)` — polls KoG player profiles, compares snapshots, detects cell completions
- `checkKoGRaceProgress(gameId)` — same for race steps
- `updateKoGBingoPlayerStats()` / `updateKoGRacePlayerStats()` — stats updates on game completion
- `runGameProgressJob()` — now checks all 4 game types (bingo, races, kog-bingo, kog-races)

### Finish Detection: Snapshot Approach

Unlike DDNet (which provides timestamps in finish data), KoG finish detection uses a **snapshot diff**:

1. **Game start**: `takeFinishSnapshot(playerName)` — stores Set of all currently finished map names
2. **Each poll**: `detectNewFinishes(playerName, targetMaps)` — fetches current finishedMaps, returns maps NOT in snapshot
3. **After detection**: `updateSnapshot(playerName, finishedMapNames)` — marks detected maps as "known"
4. **Game end**: `clearSnapshot(playerName)` — cleanup

**Polling interval**: 500ms sleep between players (vs 200ms for DDNet) due to heavier KoG requests.

### Shared Infrastructure Updates

| File | Change |
|------|--------|
| `src/services/game-actions/types.ts` | `GameCollection` now includes `'kog-bingo' | 'kog-races'` |
| `src/services/game-actions/helpers.ts` | `checkAndClearStaleActiveGame` handles all 4 collection types |
| `src/services/game-actions/join.ts` | Uses `collection` directly as `relationTo` (not hardcoded bingo/races) |
| `src/collections/Users.ts` | `activeGame`/`completedGames` now include `kog-bingo`/`kog-races` |
| `src/collections/Notifications.ts` | `relatedGame` now includes `kog-bingo`/`kog-races` |
| `src/payload.config.ts` | Registered `KogBingo`, `KogRaces` collections |

## Remaining: Frontend (Phase 4-5)

### Pages to Create

```
src/app/(frontend)/app/kog-bingo/
  ├── page.tsx              — Lobby
  ├── create/page.tsx       — Auto-create
  └── [id]/page.tsx         — Game detail

src/app/(frontend)/app/kog-race/
  ├── page.tsx              — Lobby
  ├── create/page.tsx       — Auto-create
  └── [id]/page.tsx         — Game detail
```

### Dashboard & Navigation

- Add KoG game cards to dashboard Service tab
- Add nav items for `/app/kog-bingo` and `/app/kog-race`
- Translations (6 locales)

### Reusable Components

These existing components work with KoG games without modification:
- `BingoGrid` — renders any grid with completedCells
- `GamePlayerBar` — team display
- `GameStartCountdown` — countdown timer
- `FriendInviteSearch` — invite players

KoG-specific UI needs:
- KoG category selector (7 categories vs 13)
- Difficulty range still works (KoG has stars 1-5)

## KoG Maps Data (from `get.php?p=maps`)

1062 maps total:
- Main: 339, Hard: 319, Insane: 243, Extreme: 54, Easy: 32, Solo/Unknown: 37, Mod: 38
- Stars: 1-5 (distribution: 1★=242, 2★=359, 3★=435, 4★=13, 5★=13)
- Each map has: name, category, stars, points, mapper
