import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Incoming requests (where current user is recipient)
    const { docs: incoming } = await payload.find({
      collection: 'friend-requests',
      where: {
        recipient: { equals: user.id },
        status: { equals: 'pending' },
      },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })

    // Outgoing requests (where current user is sender)
    const { docs: outgoing } = await payload.find({
      collection: 'friend-requests',
      where: {
        sender: { equals: user.id },
        status: { equals: 'pending' },
      },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })

    const formatRequest = (r: any, direction: 'incoming' | 'outgoing') => {
      const otherUser =
        direction === 'incoming'
          ? typeof r.sender === 'object' ? r.sender : null
          : typeof r.recipient === 'object' ? r.recipient : null

      return {
        id: r.id,
        direction,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              ingameNick: otherUser.ingameNick,
              skin: otherUser.ingameStats?.skin,
            }
          : null,
        message: r.message,
        createdAt: r.createdAt,
      }
    }

    return NextResponse.json({
      incoming: incoming.map((r) => formatRequest(r, 'incoming')),
      outgoing: outgoing.map((r) => formatRequest(r, 'outgoing')),
    })
  } catch (error: unknown) {
    console.error('[API] Error fetching pending requests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch requests' },
      { status: 500 },
    )
  }
}
