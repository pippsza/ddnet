import { NextRequest, NextResponse } from 'next/server'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'
import { KOG_CATEGORIES } from '@/lib/kog-constants'
import { resolveOptionalAuth } from '@/services/game-actions/auth'

const TYPE_TO_COLLECTION = {
  bingo: 'bingo',
  race: 'races',
  'kog-bingo': 'kog-bingo',
  'kog-race': 'kog-races',
} as const

type GameType = keyof typeof TYPE_TO_COLLECTION

export async function GET(req: NextRequest) {
  try {
    const { user, payload } = await resolveOptionalAuth(req)

    const type = req.nextUrl.searchParams.get('type') as GameType
    if (!TYPE_TO_COLLECTION[type]) {
      return NextResponse.json(
        { error: `type query param must be one of: ${Object.keys(TYPE_TO_COLLECTION).join(', ')}` },
        { status: 400 },
      )
    }

    const collection = TYPE_TO_COLLECTION[type]

    // Allow querying another user's games via ?userId=
    const targetUserId = req.nextUrl.searchParams.get('userId')
    const lookupId = targetUserId || user?.id

    if (!lookupId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { docs: allGames } = await payload.find({
      collection,
      where: {
        or: [
          { 'teams.players.user': { equals: lookupId } },
          ...(!targetUserId ? [{ 'teams.pendingInvites.user': { equals: lookupId } }] : []),
        ],
      },
      sort: '-createdAt',
      depth: 2,
      limit: 50,
    })

    // Fetch custom categories once for icon lookup
    const hasCustom = allGames.some((g) => g.category?.startsWith('custom_'))
    let customCats: any[] = []
    if (hasCustom) {
      const customGlobal = await payload.findGlobal({ slug: 'custom-categories' })
      customCats = (customGlobal as any)?.categories || []
    }

    const games = allGames.map((game) => {
      const totalPlayers = game.teams.reduce(
        (sum, team) => sum + (team.players?.length || 0),
        0,
      )
      const maxPlayers = game.mode === 'solo' ? 2 : 4
      const creator = typeof game.createdBy === 'object' ? game.createdBy : null

      const isPlayer = game.teams.some((team) =>
        team.players?.some((p) => {
          const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
          return pUserId === lookupId
        }),
      )
      const isPendingInvite =
        !isPlayer &&
        game.teams.some((team) =>
          team.pendingInvites?.some((p) => {
            const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
            return pUserId === lookupId
          }),
        )

      // Determine if target user won this game
      let isWinner: boolean | null = null
      if (game.gameStatus === 'completed' && game.winnerTeam != null) {
        const userTeamIndex = game.teams.findIndex((team) =>
          team.players?.some((p) => {
            const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
            return pUserId === lookupId
          }),
        )
        isWinner = userTeamIndex === game.winnerTeam
      }

      // Resolve category icon
      const stdCat = DDNET_CATEGORIES.find((c) => c.value === game.category)
        ?? KOG_CATEGORIES.find((c) => c.value === game.category)
      const categoryIcon =
        stdCat?.icon ?? customCats.find((c: any) => c.slug === game.category)?.icon

      // Base fields shared by both types
      const base = {
        id: game.id,
        title: game.title,
        mode: game.mode,
        category: game.category,
        categoryIcon,
        gameStatus: game.gameStatus,
        isPublic: game.isPublic,
        isWinner,
        isPendingInvite,
        createdBy: creator ? { id: creator.id, ingameNick: (creator as any).ingameNick } : null,
        players: totalPlayers,
        maxPlayers,
        createdAt: game.createdAt,
        completedAt: game.completedAt || null,
        duration: game.duration || null,
      }

      // Type-specific fields
      if (type === 'bingo' || type === 'kog-bingo') {
        return {
          ...base,
          gridSize: (game as any).gridSize,
          winCondition: (game as any).winCondition,
        }
      } else {
        return {
          ...base,
          categoryMode: (game as any).categoryMode,
          pathLength: (game as any).pathLength,
          server: (game as any).server,
        }
      }
    })

    return NextResponse.json({ games })
  } catch (error: unknown) {
    console.error('[API] Error fetching my games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}
