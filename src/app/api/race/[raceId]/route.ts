import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await params
    const payload = await getPayload({ config })

    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
      depth: 2,
    })

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Get current user for context
    const { user: currentUser } = await payload.auth({ headers: req.headers })

    const creator = typeof race.createdBy === 'object' ? (race.createdBy as User) : null
    const creatorId = creator?.id || race.createdBy

    const players = race.players.map((p) => {
      const playerUser = typeof p.user === 'object' ? (p.user as User) : null
      return {
        id: playerUser?.id || (typeof p.user === 'string' ? p.user : ''),
        username: playerUser?.username || p.ingameNick,
        ingameNick: p.ingameNick,
        roundsWon: p.roundsWon || 0,
        isReady: p.isReady || false,
        points: playerUser?.ingameStats?.points || 0,
        skin: playerUser?.ingameStats?.skin
          ? {
              name: playerUser.ingameStats.skin.name || 'default',
              colorBody: playerUser.ingameStats.skin.color_body || 0,
              colorFeet: playerUser.ingameStats.skin.color_feet || 0,
            }
          : null,
      }
    })

    const winnerId = race.winner
      ? typeof race.winner === 'object'
        ? (race.winner as User).id
        : race.winner
      : null
    const winnerName = race.winner
      ? typeof race.winner === 'object'
        ? (race.winner as User).username
        : null
      : null

    return NextResponse.json({
      id: race.id,
      title: race.title,
      category: race.category,
      isPublic: race.isPublic,
      inviteCode: race.isPublic ? undefined : race.inviteCode,
      totalRounds: race.totalRounds,
      currentRound: race.currentRound,
      currentMap: race.currentMap,
      server: race.server,
      status: race.status,
      players,
      rounds: race.rounds || [],
      winner: winnerId ? { id: winnerId, username: winnerName } : null,
      createdBy: { id: creatorId, username: creator?.username },
      currentUserId: currentUser?.id || null,
      startedAt: race.startedAt,
      completedAt: race.completedAt,
      createdAt: race.createdAt,
    })
  } catch (error: unknown) {
    console.error('[API] Error fetching race:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch race' },
      { status: 500 },
    )
  }
}
