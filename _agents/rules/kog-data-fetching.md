# KoG (King of Gores) Data Fetching

## Overview

KoG (kog.tw) is a Teeworlds gores community with its own ranking system, separate from DDNet. Unlike DDNet/DDStats which provide JSON APIs, KoG has **no public JSON API** — all player data must be scraped from server-rendered HTML pages.

## Architecture

```
Browser → GET /api/players/{name}/kog → Server (Next.js route)
  → getKoGSession()       // GET kog.tw/ → PHPSESSID cookie
  → fetch get.php          // GET kog.tw/get.php?p=players&player=NAME (with cookie)
  → parseKoGHtml()         // Cheerio parses ~300KB HTML → ~10KB JSON
  → BoundedCache           // 100 entries, 5min TTL
  → return KoGPlayerData
```

**Why server-side only**: KoG has no CORS headers → browsers cannot fetch directly. The server acts as a proxy that handles PHP session management and HTML parsing.

## Session Management

KoG uses PHP sessions. Every request to `get.php` requires a valid `PHPSESSID` cookie.

### Session Flow

1. **GET `https://kog.tw/`** — main page sets `PHPSESSID` via `Set-Cookie` header
2. **GET `https://kog.tw/get.php?p=players&player=NAME`** — pass `PHPSESSID` as `Cookie` header
3. Session is **single-use** for `get.php` — after one call, the session is consumed
4. `get.php` returns a **new PHPSESSID** in its response headers (for chaining)

### Critical: User-Agent Required

KoG's PHP backend checks the `User-Agent` header. Without it, `get.php` returns the text `"404 Not Found"` (HTTP 200 status but body is "404 Not Found", 13 chars).

```typescript
const KOG_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
```

Both the session request and `get.php` request must include this header.

### Implementation

```typescript
// src/lib/kog-helpers.ts

async function getKoGSession(): Promise<string | null> {
  const res = await fetch('https://kog.tw/', {
    headers: { 'User-Agent': KOG_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  })
  // Extract PHPSESSID from Set-Cookie header
  const setCookie = res.headers.getSetCookie?.() ?? []
  // ... parse PHPSESSID from cookies
}
```

## HTML Parsing (Cheerio)

`get.php` returns an HTML fragment (not a full page). Cheerio parses it server-side.

### Selectors and Data Extraction

| Data | Selector | Regex/Logic |
|------|----------|-------------|
| Player name | `$('h2').first()` | `.text().trim()` |
| Rank + points | `$('li.list-group-item')` | `/Rank\s*(\d+)\.\s*with\s*([\d,]+)\s*points/` |
| Fixed points | `$('li.list-group-item')` | `/Fixed points:\s*(\d+)/` |
| Season points | `$('li.list-group-item')` | `/Season points:\s*(\d+)/` |
| Skin | `$('#playerSkin').attr('src')` | `/skin=([^&]+)&body_color=(\d+)&feet_color=(\d+)/` |
| Wasted time | `$('h5:contains("Wasted time")').next('h6')` | Parse months/days/hours/minutes/seconds |
| Teammates | `$('th:contains("best teammates")').closest('table').find('td')` | `<b>count</b> <a>name</a>` per cell |
| Categories | `$('#nav-maps table').first().find('tbody td')` | `/(\d+)\s*\/\s*(\d+)/` for each of 7 cells |
| Finished maps | `$('#pills-finished tbody tr')` | cols: th=name, td=time, td=finishes, td=date |
| Unfinished maps | `$('#pills-unfinished tbody tr')` | `$(row).find('a').first().text()` |

### HTML Quirks

- `<td>` tags are **not closed** in the finished maps table (`<td>1` without `</td>`)
- Cheerio auto-closes them and handles this correctly
- Each parsing section is wrapped in `try/catch` for partial data resilience
- If no rank, no points, and no finished maps → return `null` (player doesn't exist on KoG)

## Available Data

### KoGPlayerData

```typescript
interface KoGPlayerData {
  name: string              // Player nickname
  rank: number | null       // Global rank (e.g., 2127)
  totalPoints: number       // Total completionist points
  fixedPoints: number       // Points from permanent maps
  seasonPoints: number      // Points from seasonal maps
  skin: KoGSkin | null      // Skin name + body/feet colors
  wastedTimeSeconds: number // Total time on finished maps (seconds)
  teammates: KoGTeammate[]  // Top 10 teammates with map counts
  categoryProgress: KoGCategoryProgress[] // 7 categories with done/total
  finishedMaps: KoGFinishedMap[]   // All finished maps with times
  unfinishedMaps: string[]         // Names of unfinished maps
}
```

### KoG Categories (7 total)

| Category | Description |
|----------|-------------|
| Solo | Single-player gores maps |
| Easy | Beginner gores maps |
| Main | Standard difficulty |
| Hard | Hard gores maps |
| Insane | Very hard maps |
| Extreme | Hardest maps |
| Mod | Community mod maps |

**vs DDNet categories** (13): Novice, Moderate, Brutal, Insane, Dummy, DDmaX (Easy/Next/Pro/Nut), Oldschool, Solo, Race

### Finished Map Data

```typescript
interface KoGFinishedMap {
  name: string          // "Abyss"
  bestTime: string      // "00:51:59" (HH:MM:SS format, as string)
  finishes: number      // 1
  lastFinishDate: string // "2023-04-26 17:53:50" (YYYY-MM-DD HH:MM:SS)
}
```

**Note**: `lastFinishDate` has second-level precision, which is useful for finish detection in game modes.

## Caching

- **BoundedCache**: same pattern as `ddnet-helpers.ts`
- **Max entries**: 100 players
- **TTL**: 5 minutes per entry
- **Cleanup interval**: every 2 minutes (evicts expired entries)
- **Cache key**: `playerName.toLowerCase()`

## File Map

| File | Purpose |
|------|---------|
| `src/lib/kog-types.ts` | TypeScript interfaces |
| `src/lib/kog-helpers.ts` | Session management, HTML parser, cache, `fetchKoGPlayerData()` |
| `src/app/api/players/[name]/kog/route.ts` | Next.js API route (GET proxy) |
| `src/hooks/use-kog.ts` | SWR hook: `useKoG(playerName)` with 60s dedup |
| `src/components/stats/KoGSection.tsx` | Stats display: StatCards, progress bars, teammates, maps table |
| `src/lib/chart-constants.ts` | KoG category colors (Easy, Main, Hard, Extreme, Mod) |

## Limitations

- **Response size**: ~300KB HTML per player → parsed to ~10KB JSON
- **No CORS**: browser cannot fetch directly, server proxy required
- **Session per request**: each `fetchKoGPlayerData()` makes 2 HTTP requests (1 session + 1 data)
- **Cloudflare**: KoG is behind Cloudflare — may rate-limit aggressive polling
- **No map list API**: KoG does not provide a JSON list of all maps (only per-player data)
- **No real-time finish API**: finish detection requires polling player profiles

## KoG Website Structure (for reference)

KoG is a PHP SPA with hash-based routing:

- `kog.tw/#p=players&player=NAME` — player profile (client-side route)
- `kog.tw/get.php?p=players&player=NAME` — HTML fragment loaded via AJAX
- `kog.tw/api.php?type=csrf-token` — CSRF token for POST requests
- `kog.tw/api.php` (POST) — chart data, name history (requires CSRF token, unreliable)
- `kog.tw/public/p.js` — main SPA router
- `kog.tw/public/scripts/players.js` — player page logic (chart + name history)
