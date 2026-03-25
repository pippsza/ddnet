import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { handleJoin } from '@/services/game-actions/join'
import type { GameCollection, GameDocument } from '@/services/game-actions/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { inviteCode } = await params
    const body = await req.json().catch(() => ({}))

    // Search all game collections for the invite code
    const [bingoResult, raceResult, kogBingoResult, kogRaceResult] = await Promise.all([
      auth.payload.find({
        collection: 'bingo',
        where: { inviteCode: { equals: inviteCode } },
        depth: 1,
        limit: 1,
      }),
      auth.payload.find({
        collection: 'races',
        where: { inviteCode: { equals: inviteCode } },
        depth: 1,
        limit: 1,
      }),
      auth.payload.find({
        collection: 'kog-bingo',
        where: { inviteCode: { equals: inviteCode } },
        depth: 1,
        limit: 1,
      }),
      auth.payload.find({
        collection: 'kog-races',
        where: { inviteCode: { equals: inviteCode } },
        depth: 1,
        limit: 1,
      }),
    ])

    let game: GameDocument | undefined = bingoResult.docs[0]
    let collection: GameCollection = 'bingo'

    if (!game && raceResult.docs[0]) {
      game = raceResult.docs[0]
      collection = 'races'
    }
    if (!game && kogBingoResult.docs[0]) {
      game = kogBingoResult.docs[0]
      collection = 'kog-bingo'
    }
    if (!game && kogRaceResult.docs[0]) {
      game = kogRaceResult.docs[0]
      collection = 'kog-races'
    }

    if (!game) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Race requires verified nickname
    if (collection === 'races' && !auth.user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Game is not accepting new players' }, { status: 400 })
    }

    // Check if already in game
    for (const team of game.teams) {
      if (
        team.players?.some((p) => {
          const playerId = typeof p.user === 'string' ? p.user : p.user.id
          return playerId === auth.user.id
        })
      ) {
        return NextResponse.json({
          success: true,
          gameId: game.id,
          message: 'Already in this game',
        })
      }
    }

    const result = await handleJoin(
      { ...auth, gameId: game.id, collection, game },
      body.teamIndex,
    )
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ...result.data, gameId: game.id })
  } catch (error: unknown) {
    console.error('[API] Error joining game by invite code:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join game' },
      { status: 500 },
    )
  }
}
