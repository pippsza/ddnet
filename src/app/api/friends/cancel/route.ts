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

    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const friendRequest = await payload.findByID({
      collection: 'friend-requests',
      id: requestId,
      depth: 0,
    })

    if (!friendRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only sender can cancel
    const senderId =
      typeof friendRequest.sender === 'string'
        ? friendRequest.sender
        : friendRequest.sender.id

    if (senderId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to cancel this request' }, { status: 403 })
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    await payload.delete({
      collection: 'friend-requests',
      id: requestId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error cancelling friend request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel request' },
      { status: 500 },
    )
  }
}
