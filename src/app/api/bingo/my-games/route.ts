import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { DDNET_CATEGORIES } from '@/lib/ddnet-constants'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all games where user is a player or has a pending invite
    const { docs: allGames } = await payload.find({
      collection: 'bingo',
      where: {
        or: [
          { 'teams.players.user': { equals: user.id } },
          { 'teams.pendingInvites.user': { equals: user.id } },
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

      // Check if user is a pending invite (not yet a player)
      const isPlayer = game.teams.some((team) =>
        team.players?.some((p) => {
          const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
          return pUserId === user.id
        }),
      )
      const isPendingInvite = !isPlayer && game.teams.some((team) =>
        team.pendingInvites?.some((p) => {
          const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
          return pUserId === user.id
        }),
      )

      // Determine if current user won this game
      let isWinner: boolean | null = null
      if (game.gameStatus === 'completed' && game.winnerTeam != null) {
        const userTeamIndex = game.teams.findIndex((team) =>
          team.players?.some((p) => {
            const pUserId = typeof p.user === 'object' ? p.user?.id : p.user
            return pUserId === user.id
          }),
        )
        isWinner = userTeamIndex === game.winnerTeam
      }

      // Resolve category icon
      const stdCat = DDNET_CATEGORIES.find((c) => c.value === game.category)
      const categoryIcon = stdCat?.icon
        ?? customCats.find((c: any) => c.slug === game.category)?.icon

      return {
        id: game.id,
        title: game.title,
        mode: game.mode,
        category: game.category,
        categoryIcon,
        gridSize: game.gridSize,
        winCondition: game.winCondition,
        gameStatus: game.gameStatus,
        isPublic: game.isPublic,
        isWinner,
        isPendingInvite,
        createdBy: creator ? { id: creator.id, username: creator.ingameNick } : null,
        players: totalPlayers,
        maxPlayers,
        createdAt: game.createdAt,
        completedAt: game.completedAt || null,
        duration: game.duration || null,
      }
    })

    return NextResponse.json({ games })
  } catch (error) {
    console.error('[API] Error fetching my bingo games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}
