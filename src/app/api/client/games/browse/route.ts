import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, Race, User } from '@/payload-types'

/**
 * GET /api/client/games/browse?type=bingo|race&page=1&limit=20
 * No auth required — public games are readable by anyone.
 * Returns a flattened list for easy C++ JSON parsing.
 */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'bingo'
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20')), 50)

    const collection = type === 'race' ? 'races' : 'bingo'

    const payload = await getPayload({ config })

    const { docs, totalDocs, totalPages } = await payload.find({
      collection,
      where: {
        isPublic: { equals: true },
        gameStatus: { in: ['waiting', 'ready'] },
      },
      sort: '-createdAt',
      depth: 2,
      page,
      limit,
    })

    const games = docs.map((doc) => formatGameForBrowse(doc, collection))

    return NextResponse.json({ games, totalDocs, totalPages, page })
  } catch (error: any) {
    console.error('[API] Error browsing games:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to browse games' },
      { status: 500 },
    )
  }
}

function formatGameForBrowse(doc: Bingo | Race, collection: 'bingo' | 'races') {
  const type = collection === 'bingo' ? 'bingo' : 'race'

  // Count players across all teams
  let playerCount = 0
  let maxPlayers = 0
  for (const team of doc.teams) {
    playerCount += (team.players ?? []).length
    maxPlayers += 2
  }

  // Get creator nick
  const creator = typeof doc.createdBy === 'object' ? (doc.createdBy as User) : null
  const creatorNick = creator?.ingameNick ?? creator?.username ?? '?'

  const base: Record<string, any> = {
    type,
    id: doc.id,
    title: doc.title,
    mode: doc.mode,
    category: doc.category,
    gameStatus: doc.gameStatus,
    playerCount,
    maxPlayers,
    creatorNick,
    inviteCode: doc.inviteCode ?? null,
    createdAt: doc.createdAt,
  }

  if (type === 'bingo') {
    const bingo = doc as Bingo
    base.gridSize = bingo.gridSize
    base.winCondition = bingo.winCondition
  } else {
    const race = doc as Race
    base.pathLength = race.pathLength
    base.categoryMode = race.categoryMode
  }

  return base
}
