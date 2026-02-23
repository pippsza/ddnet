# DDNet Bingo — Project Rules

## Payload CMS Rules

Full reference: `_agents/AGENTS.md` and `_agents/rules/` — read when working on collections, hooks, access control, or components.

### Critical Rules

1. **Payload auto-generates REST API** for all collections (`GET/POST/PATCH/DELETE /api/{collection}`). Don't create custom API routes that duplicate this — use Payload's built-in endpoints directly from the frontend.
2. **Local API bypasses access control by default.** When passing `user`, ALWAYS set `overrideAccess: false`.
3. **Always pass `req` to nested operations in hooks** for transaction safety.
4. **Use context flags** to prevent infinite hook loops.
5. **Run `npx tsc --noEmit`** after schema/code changes to validate types.
6. **Run `generate:types`** after modifying collection schemas.

### Payload API Response Format

- List: `{ docs: [...], totalDocs, totalPages, page }`
- Create: `{ doc: {...}, message: "..." }`
- Single item: fetch via `GET /api/{collection}?where[field][equals]=value&depth=1&limit=1` → `data.docs[0]`
- Relationships at `depth: 1` return full objects (e.g., `article.author.ingameNick`, `article.coverImage.url`)
- Rich text stored as Lexical JSON. Use `textToLexical()` to create, `extractText()` to read.

### Project Structure

```
src/
├── app/(frontend)/     # Frontend routes (Next.js App Router)
├── app/(payload)/      # Payload admin routes
├── collections/        # Collection configs
├── globals/            # Global configs
├── components/         # React components (ui/, tee/, stats/, layout/)
├── hooks/              # Custom hooks (use-ddstats, etc.)
├── lib/                # Helpers (ddnet-helpers, format-utils, etc.)
├── services/           # Business logic (verification, bot)
└── payload.config.ts   # Main Payload config
```

## Frontend Patterns

- **SWR** for client-side data fetching with polling
- **shadcn/ui** components in `src/components/ui/`
- **TeeAvatarWithFallback** for DDNet character avatars
- **Lucide React** for icons
- Chart color: `#38bdf8` (sky-blue-400) for dark mode visibility

## DDNet Integration

- `ddnet` npm package for Master Server queries (online status, player search)
- DDStats API: `ddstats.tw/player/json?player=NAME` (comprehensive stats)
- DDNet API: `ddnet.org/players/?json2=NAME` (basic profile)
- `findPlayerOnline()` from `src/lib/ddnet-helpers.ts` for live server info
