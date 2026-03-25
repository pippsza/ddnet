import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, Race, KogBingo, KogRace, User } from '@/payload-types'

const TYPE_TO_COLLECTION: Record<string, string> = {
  bingo: 'bingo',
  race: 'races',
  'kog-bingo': 'kog-bingo',
  'kog-race': 'kog-races',
}

/**
 * GET /api/client/games/browse?type=bingo|race|kog-bingo|kog-race&page=1&limit=20
 * No auth required — public games are readable by anyone.
 * Returns a flattened list for easy C++ JSON parsing.
 */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'bingo'
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20')), 50)

    const collection = (TYPE_TO_COLLECTION[type] || 'bingo') as 'bingo' | 'races' | 'kog-bingo' | 'kog-races'

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

function formatGameForBrowse(doc: Bingo | Race | KogBingo | KogRace, collection: string) {
  const isBingoLike = collection === 'bingo' || collection === 'kog-bingo'
  const COLLECTION_TO_TYPE: Record<string, string> = {
    bingo: 'bingo',
    races: 'race',
    'kog-bingo': 'kog-bingo',
    'kog-races': 'kog-race',
  }
  const type = COLLECTION_TO_TYPE[collection] || 'bingo'

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

  if (isBingoLike) {
    const bingo = doc as Bingo | KogBingo
    base.gridSize = bingo.gridSize
    base.winCondition = bingo.winCondition
  } else {
    const race = doc as Race | KogRace
    base.pathLength = race.pathLength
    base.categoryMode = (race as Race).categoryMode ?? 'selected'
  }

  return base
}
