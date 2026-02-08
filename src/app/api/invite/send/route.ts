import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, gameType, gameId } = await req.json()

    if (!recipientId || !gameType || !gameId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['bingo', 'races'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 })
    }

    const game = await payload.findByID({
      collection: gameType as 'bingo' | 'races',
      id: gameId,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: recipientId,
        type: 'game_invite',
        title: 'Game Invite',
        message: `${user.username} invited you to ${game.title}`,
        actionUrl: `/app/${gameType}/${gameId}`,
        relatedGame: { relationTo: gameType, value: gameId },
        relatedUser: user.id,
        metadata: {
          gameType,
          inviteCode: (game as any).inviteCode,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error sending invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 },
    )
  }
}
